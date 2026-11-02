import type { ProgressMap, Settings, WordProgress } from '../types';
import { id, jk, range } from '../test/fixtures';
import { makeRng } from './random';
import { buildDailySession, buildStagePractice, buildWeakSession, dailyCounts } from './session';
import { buildDataset } from './validate';

const TODAY = '2026-11-10';
const ds = buildDataset([range(100, (n) => jk(n)), range(100, (n) => jk(n + 100)), range(100, (n) => jk(n + 200))]);
const settings: Settings = { newPerDay: 20, iosGuideSeen: true };
const wp = (o: Partial<WordProgress> = {}): WordProgress => ({
  box: 2, due: '2026-11-20', correct: 1, wrong: 0, lastCorrect: true, weak: false, ...o,
});
const ids = (s: { queue: { id: string }[] }) => s.queue.map((q) => q.id);

test('復習は期日の古い順に最大100問', () => {
  const progress: ProgressMap = {};
  // ステージ1全語＋ステージ2の50語を出題済み・期日到来。番号が大きいほど期日が古い
  for (let n = 1; n <= 150; n++) {
    const day = String(1 + Math.floor((150 - n) / 20)).padStart(2, '0');
    progress[id('jk', n)] = wp({ due: `2026-11-${day}` });
  }
  const s = buildDailySession('jukugo', ds, progress, { ...settings, newPerDay: 10 }, TODAY, makeRng(1));
  const review = ids(s).filter((x) => progress[x]);
  expect(review).toHaveLength(100);
  expect(new Set(review)).toEqual(new Set(range(100, (n) => id('jk', n + 50))));
  // 新しい語はステージ2の未出題から
  const fresh = ids(s).filter((x) => !progress[x]);
  expect(fresh).toEqual(expect.arrayContaining(range(10, (n) => id('jk', 150 + n))));
  expect(fresh).toHaveLength(10);
});

test('新しい語は現在のステージから設定数', () => {
  const s = buildDailySession('jukugo', ds, {}, settings, TODAY, makeRng(1));
  expect(new Set(ids(s))).toEqual(new Set(range(20, (n) => id('jk', n))));
  expect(s).toMatchObject({ mode: 'jukugo', kind: 'daily', stage: null, day: TODAY, index: 0, answeredChoice: null, results: [] });
  expect(s.queue.every((q) => q.requeue === false)).toBe(true);
});

test('期日が未来の語は復習に入らない', () => {
  const progress: ProgressMap = { [id('jk', 1)]: wp({ due: '2026-11-11' }) };
  const s = buildDailySession('jukugo', ds, progress, settings, TODAY, makeRng(1));
  expect(ids(s)).not.toContain(id('jk', 1));
});

test('現在ステージ全出題・未クリアなら新しい語0', () => {
  const progress: ProgressMap = {};
  for (let n = 1; n <= 100; n++) progress[id('jk', n)] = wp({ lastCorrect: n <= 50 });
  const s = buildDailySession('jukugo', ds, progress, settings, TODAY, makeRng(1));
  expect(s.queue).toHaveLength(0);
  expect(dailyCounts('jukugo', ds, progress, settings, TODAY)).toEqual({ review: 0, fresh: 0 });
});

test('ステージ練習は未出題→不正解→その他の優先で20問', () => {
  const progress: ProgressMap = {};
  for (let n = 1; n <= 90; n++) progress[id('jk', n)] = wp({ lastCorrect: n > 15 });
  // 未出題 91〜100（10語）、不正解 1〜15（15語）→ 未出題10＋不正解の先頭10
  const s = buildStagePractice('jukugo', 1, ds, progress, TODAY, makeRng(1));
  expect(s).toMatchObject({ kind: 'stage', stage: 1 });
  expect(new Set(ids(s))).toEqual(new Set([...range(10, (n) => id('jk', 90 + n)), ...range(10, (n) => id('jk', n))]));
});

test('苦手まとめは weak の語のみ最大20問', () => {
  const progress: ProgressMap = {};
  for (let n = 1; n <= 30; n++) progress[id('jk', n)] = wp({ weak: n <= 25 });
  const s = buildWeakSession('jukugo', ds, progress, TODAY, makeRng(1));
  expect(s.kind).toBe('weak');
  expect(s.queue).toHaveLength(20);
  ids(s).forEach((x) => expect(progress[x].weak).toBe(true));
});

test('全QueueItemの choices に正解が含まれ、5択', () => {
  const s = buildDailySession('jukugo', ds, {}, settings, TODAY, makeRng(2));
  s.queue.forEach((q) => {
    expect(q.choices).toContain(q.id);
    expect(q.choices).toHaveLength(5);
  });
});

test('dailyCounts は buildDailySession の件数と一致', () => {
  const progress: ProgressMap = {};
  for (let n = 1; n <= 30; n++) progress[id('jk', n)] = wp({ due: n <= 12 ? '2026-11-09' : '2026-11-30' });
  const c = dailyCounts('jukugo', ds, progress, settings, TODAY);
  expect(c).toEqual({ review: 12, fresh: 20 });
  expect(buildDailySession('jukugo', ds, progress, settings, TODAY, makeRng(1)).queue).toHaveLength(32);
});
