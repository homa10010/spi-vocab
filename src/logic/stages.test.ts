import type { ProgressMap, WordProgress } from '../types';
import { id, jk, range } from '../test/fixtures';
import { clearedCount, currentNewStage, isCleared, stageInfos } from './stages';
import { buildDataset } from './validate';

const ds = buildDataset([range(100, (n) => jk(n)), range(100, (n) => jk(n + 100)), range(100, (n) => jk(n + 200))]);
const wp = (lastCorrect: boolean): WordProgress => ({ box: 1, due: '2026-11-03', correct: 1, wrong: 0, lastCorrect, weak: false });
const answered = (from: number, to: number, correctUpTo: number): ProgressMap => {
  const m: ProgressMap = {};
  for (let n = from; n <= to; n++) m[id('jk', n)] = wp(n <= correctUpTo);
  return m;
};

test('80語正解・全出題でクリア', () => {
  expect(isCleared({ total: 100, seen: 100, correctNow: 80 })).toBe(true);
});
test('79語ではクリアしない', () => {
  expect(isCleared({ total: 100, seen: 100, correctNow: 79 })).toBe(false);
});
test('未出題が残るとクリアしない', () => {
  expect(isCleared({ total: 100, seen: 99, correctNow: 99 })).toBe(false);
});

test('初期状態はステージ1だけ開放', () => {
  const infos = stageInfos(ds, {});
  expect(infos.map((i) => i.unlocked)).toEqual([true, false, false]);
  expect(infos[0]).toMatchObject({ stage: 1, total: 100, seen: 0, correctNow: 0, accuracy: 0, cleared: false });
  expect(currentNewStage(infos)).toBe(1);
  expect(clearedCount(infos)).toBe(0);
});

test('ステージ1クリアでステージ2開放', () => {
  const infos = stageInfos(ds, answered(1, 100, 85));
  expect(infos[0]).toMatchObject({ seen: 100, correctNow: 85, accuracy: 0.85, cleared: true });
  expect(infos.map((i) => i.unlocked)).toEqual([true, true, false]);
  expect(currentNewStage(infos)).toBe(2);
  expect(clearedCount(infos)).toBe(1);
});

test('現在のステージが全出題済み・未クリアなら currentNewStage は null', () => {
  const infos = stageInfos(ds, answered(1, 100, 50));
  expect(infos[0].cleared).toBe(false);
  expect(infos[1].unlocked).toBe(false);
  expect(currentNewStage(infos)).toBeNull();
});

test('クリア後に復習で正答率が下がっても、次のステージに進んでいればクリアのまま', () => {
  const progress = { ...answered(1, 100, 77), ...answered(101, 140, 140) };
  const infos = stageInfos(ds, progress);
  expect(infos[0].cleared).toBe(true);
  expect(infos[1].unlocked).toBe(true);
  expect(currentNewStage(infos)).toBe(2);
  expect(clearedCount(infos)).toBe(1);
});
