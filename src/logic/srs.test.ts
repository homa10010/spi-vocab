import type { WordProgress } from '../types';
import { applyAnswer, isDue, isSeen } from './srs';

const p = (o: Partial<WordProgress> = {}): WordProgress => ({
  box: 1,
  due: '2026-11-02',
  correct: 0,
  wrong: 0,
  lastCorrect: false,
  weak: false,
  ...o,
});

test('未出題で正解 → box1・1日後', () => {
  expect(applyAnswer(undefined, true, '2026-11-02')).toEqual({
    box: 1, due: '2026-11-03', correct: 1, wrong: 0, lastCorrect: true, weak: false,
  });
});
test('未出題で不正解 → box1・翌日・苦手', () => {
  expect(applyAnswer(undefined, false, '2026-11-02')).toEqual({
    box: 1, due: '2026-11-03', correct: 0, wrong: 1, lastCorrect: false, weak: true,
  });
});
test('box1で正解 → box2・3日後', () => {
  expect(applyAnswer(p({ box: 1 }), true, '2026-11-02')).toMatchObject({ box: 2, due: '2026-11-05' });
});
test('box2で正解 → box3・7日後', () => {
  expect(applyAnswer(p({ box: 2 }), true, '2026-11-02')).toMatchObject({ box: 3, due: '2026-11-09' });
});
test('box3で正解 → box4・14日後', () => {
  expect(applyAnswer(p({ box: 3 }), true, '2026-11-02')).toMatchObject({ box: 4, due: '2026-11-16' });
});
test('box5で正解 → box5のまま・30日後', () => {
  expect(applyAnswer(p({ box: 5 }), true, '2026-11-02')).toMatchObject({ box: 5, due: '2026-12-02' });
});
test('不正解 → box1・翌日・苦手・回数加算', () => {
  expect(applyAnswer(p({ box: 4, correct: 3, wrong: 1 }), false, '2026-11-02')).toEqual({
    box: 1, due: '2026-11-03', correct: 3, wrong: 2, lastCorrect: false, weak: true,
  });
});
test('苦手はbox3到達で外れる', () => {
  expect(applyAnswer(p({ box: 1, weak: true }), true, '2026-11-02')).toMatchObject({ box: 2, weak: true });
  expect(applyAnswer(p({ box: 2, weak: true }), true, '2026-11-02')).toMatchObject({ box: 3, weak: false });
});
test('isDue: 期日以前はtrue、未来・未出題はfalse', () => {
  expect(isDue(p({ due: '2026-11-02' }), '2026-11-02')).toBe(true);
  expect(isDue(p({ due: '2026-11-01' }), '2026-11-02')).toBe(true);
  expect(isDue(p({ due: '2026-11-03' }), '2026-11-02')).toBe(false);
  expect(isDue(undefined, '2026-11-02')).toBe(false);
  expect(isDue(p({ box: 0 }), '2026-11-02')).toBe(false);
});
test('isSeen: box1以上', () => {
  expect(isSeen(undefined)).toBe(false);
  expect(isSeen(p({ box: 0 }))).toBe(false);
  expect(isSeen(p({ box: 1 }))).toBe(true);
});
