import type { Session } from '../types';
import { answer, currentItem, isFinished, next, REQUEUE_GAP } from './runner';

const mk = (count: number): Session => ({
  mode: 'jukugo',
  kind: 'daily',
  stage: null,
  day: '2026-11-02',
  queue: Array.from({ length: count }, (_, i) => ({ id: `w${i}`, choices: [`w${i}`, 'x1', 'x2', 'x3', 'x4'], requeue: false })),
  index: 0,
  answeredChoice: null,
  results: [],
});

test('REQUEUE_GAP は3', () => {
  expect(REQUEUE_GAP).toBe(3);
});

test('正解で記録される', () => {
  const { session, recorded } = answer(mk(5), 'w0');
  expect(recorded).toEqual({ id: 'w0', correct: true });
  expect(session.results).toEqual([{ id: 'w0', correct: true }]);
  expect(session.answeredChoice).toBe('w0');
  expect(session.queue).toHaveLength(5);
});

test('不正解は3問後に再出題として挿入される', () => {
  const { session, recorded } = answer(mk(10), 'x1');
  expect(recorded).toEqual({ id: 'w0', correct: false });
  expect(session.queue).toHaveLength(11);
  expect(session.queue[4]).toEqual({ id: 'w0', choices: ['w0', 'x1', 'x2', 'x3', 'x4'], requeue: true });
  expect(session.queue.slice(1, 4).map((q) => q.id)).toEqual(['w1', 'w2', 'w3']);
});

test('末尾付近の不正解は最後に追加', () => {
  const s = { ...mk(3), index: 2 };
  const { session } = answer(s, 'x1');
  expect(session.queue).toHaveLength(4);
  expect(session.queue[3]).toMatchObject({ id: 'w2', requeue: true });
});

test('再出題の回答は記録されない', () => {
  const s = mk(2);
  s.queue[0] = { ...s.queue[0], requeue: true };
  const { session, recorded } = answer(s, 'x1');
  expect(recorded).toBeNull();
  expect(session.results).toEqual([]);
  expect(session.queue).toHaveLength(2);
  expect(session.answeredChoice).toBe('x1');
});

test('回答済みの問題への2回目の回答は無視される', () => {
  const a = answer(mk(5), 'x1').session;
  const b = answer(a, 'w0');
  expect(b.recorded).toBeNull();
  expect(b.session.results).toHaveLength(1);
  expect(b.session.queue).toHaveLength(a.queue.length);
  expect(b.session.answeredChoice).toBe('x1');
});

test('next で次の問題へ、最後で isFinished', () => {
  let s = answer(mk(2), 'w0').session;
  expect(isFinished(s)).toBe(false);
  s = next(s);
  expect(s.index).toBe(1);
  expect(s.answeredChoice).toBeNull();
  expect(currentItem(s)?.id).toBe('w1');
  s = next(answer(s, 'w1').session);
  expect(isFinished(s)).toBe(true);
  expect(currentItem(s)).toBeNull();
});

test('完了後の answer は何もしない', () => {
  const s = { ...mk(1), index: 1 };
  expect(answer(s, 'w0')).toEqual({ session: s, recorded: null });
});
