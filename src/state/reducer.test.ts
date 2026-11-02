import type { Mode, Session } from '../types';
import { en, jk, range } from '../test/fixtures';
import { defaultSave } from '../logic/storage';
import { buildDataset } from '../logic/validate';
import { reducer, sanitizeOnLoad } from './reducer';

const TODAY = '2026-11-02';
const datasets: Record<Mode, ReturnType<typeof buildDataset>> = {
  jukugo: buildDataset([range(10, (n) => jk(n))]),
  english: buildDataset([range(10, (n) => en(n))]),
};
const session = (o: Partial<Session> = {}): Session => ({
  mode: 'jukugo', kind: 'daily', stage: null, day: TODAY,
  queue: [
    { id: 'jk-0001', choices: ['jk-0001', 'jk-0002', 'jk-0003', 'jk-0004', 'jk-0005'], requeue: false },
    { id: 'jk-0002', choices: ['jk-0002', 'jk-0001', 'jk-0003', 'jk-0004', 'jk-0005'], requeue: false },
  ],
  index: 0, answeredChoice: null, results: [], ...o,
});

test('START でセッションが入る', () => {
  const s = reducer(defaultSave(), { type: 'START', session: session() });
  expect(s.session).toEqual(session());
});

test('ANSWER で progress と stats が更新される', () => {
  let s = reducer(defaultSave(), { type: 'START', session: session() });
  s = reducer(s, { type: 'ANSWER', choiceId: 'jk-0001', today: TODAY });
  expect(s.progress.jukugo['jk-0001']).toMatchObject({ box: 1, correct: 1, lastCorrect: true });
  expect(s.stats).toEqual({ streak: 1, lastStudyDay: TODAY });
  expect(s.session?.answeredChoice).toBe('jk-0001');
});

test('ANSWER の連打で progress の正解回数は1回分', () => {
  let s = reducer(defaultSave(), { type: 'START', session: session() });
  s = reducer(s, { type: 'ANSWER', choiceId: 'jk-0001', today: TODAY });
  s = reducer(s, { type: 'ANSWER', choiceId: 'jk-0001', today: TODAY });
  s = reducer(s, { type: 'ANSWER', choiceId: 'jk-0002', today: TODAY });
  expect(s.progress.jukugo['jk-0001']).toMatchObject({ correct: 1, wrong: 0 });
});

test('再出題の回答は progress を変えない', () => {
  const sess = session();
  sess.queue[0] = { ...sess.queue[0], requeue: true };
  let s = reducer(defaultSave(), { type: 'START', session: sess });
  s = reducer(s, { type: 'ANSWER', choiceId: 'jk-0002', today: TODAY });
  expect(s.progress.jukugo['jk-0001']).toBeUndefined();
});

test('NEXT と QUIT', () => {
  let s = reducer(defaultSave(), { type: 'START', session: session() });
  s = reducer(s, { type: 'ANSWER', choiceId: 'jk-0001', today: TODAY });
  s = reducer(s, { type: 'NEXT' });
  expect(s.session?.index).toBe(1);
  s = reducer(s, { type: 'QUIT' });
  expect(s.session).toBeNull();
});

test('設定・iOS案内・インポート', () => {
  let s = reducer(defaultSave(), { type: 'SET_NEW_PER_DAY', value: 30 });
  expect(s.settings.newPerDay).toBe(30);
  s = reducer(s, { type: 'DISMISS_IOS_GUIDE' });
  expect(s.settings.iosGuideSeen).toBe(true);
  const imported = { ...defaultSave(), stats: { streak: 9, lastStudyDay: TODAY } };
  expect(reducer(s, { type: 'IMPORT', save: imported })).toEqual(imported);
});

test('RESET_MODE は他モードの進捗を消さない', () => {
  const base = defaultSave();
  base.progress.jukugo['jk-0001'] = { box: 1, due: TODAY, correct: 1, wrong: 0, lastCorrect: true, weak: false };
  base.progress.english['en-0001'] = { box: 1, due: TODAY, correct: 1, wrong: 0, lastCorrect: true, weak: false };
  base.session = session();
  const s = reducer(base, { type: 'RESET_MODE', mode: 'jukugo' });
  expect(s.progress.jukugo).toEqual({});
  expect(s.progress.english['en-0001']).toBeDefined();
  expect(s.session).toBeNull();
  const t = reducer(base, { type: 'RESET_MODE', mode: 'english' });
  expect(t.session).not.toBeNull();
});

test('前日のセッションは読み込み時に破棄', () => {
  const s = sanitizeOnLoad({ ...defaultSave(), session: session({ day: '2026-11-01' }) }, datasets, TODAY);
  expect(s.session).toBeNull();
});

test('存在しないIDを含む問題は読み込み時に除かれ、index が詰まる', () => {
  const sess = session({
    queue: [
      { id: 'jk-0999', choices: ['jk-0999', 'jk-0001', 'jk-0002', 'jk-0003', 'jk-0004'], requeue: false },
      { id: 'jk-0001', choices: ['jk-0001', 'jk-0888', 'jk-0002', 'jk-0003', 'jk-0004'], requeue: false },
      { id: 'jk-0002', choices: ['jk-0002', 'jk-0001', 'jk-0003', 'jk-0004', 'jk-0005'], requeue: false },
      { id: 'jk-0003', choices: ['jk-0003', 'jk-0001', 'jk-0002', 'jk-0004', 'jk-0005'], requeue: false },
    ],
    index: 2,
    answeredChoice: 'jk-0001',
  });
  const s = sanitizeOnLoad({ ...defaultSave(), session: sess }, datasets, TODAY);
  expect(s.session?.queue.map((q) => q.id)).toEqual(['jk-0002', 'jk-0003']);
  // 回答済みだった問題は記録済みなので、次の問題から再開する
  expect(s.session?.index).toBe(1);
  expect(s.session?.answeredChoice).toBeNull();
});

test('今日の未回答のセッションはそのまま残る', () => {
  const s = sanitizeOnLoad({ ...defaultSave(), session: session() }, datasets, TODAY);
  expect(s.session).toEqual(session());
});

test('回答済みのまま閉じたら次の問題から再開し、二重に記録できない', () => {
  const s = sanitizeOnLoad({ ...defaultSave(), session: session({ answeredChoice: 'jk-0001' }) }, datasets, TODAY);
  expect(s.session?.index).toBe(1);
  expect(s.session?.answeredChoice).toBeNull();
});

test('DROP_STALE は日付の違うセッションだけを捨てる', () => {
  const base = { ...defaultSave(), session: session() };
  expect(reducer(base, { type: 'DROP_STALE', today: TODAY })).toBe(base);
  expect(reducer(base, { type: 'DROP_STALE', today: '2026-11-03' }).session).toBeNull();
});
