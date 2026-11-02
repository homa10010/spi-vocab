import { dayKey } from './day';
import { displayStreak, recordStudy } from './streak';

test('午前3時の学習は前日扱い', () => {
  expect(recordStudy({ streak: 3, lastStudyDay: '2026-11-01' }, dayKey(new Date(2026, 10, 3, 3, 0)))).toEqual({
    streak: 4, lastStudyDay: '2026-11-02',
  });
});
test('初めての学習は1', () => {
  expect(recordStudy({ streak: 0, lastStudyDay: null }, '2026-11-02')).toEqual({ streak: 1, lastStudyDay: '2026-11-02' });
});
test('1日空くと1に戻る', () => {
  expect(recordStudy({ streak: 5, lastStudyDay: '2026-10-31' }, '2026-11-02')).toEqual({ streak: 1, lastStudyDay: '2026-11-02' });
});
test('同日2回目は変化なし', () => {
  const s = { streak: 2, lastStudyDay: '2026-11-02' };
  expect(recordStudy(s, '2026-11-02')).toBe(s);
});
test('表示：今日か昨日ならそのまま、一昨日以前なら0', () => {
  expect(displayStreak({ streak: 4, lastStudyDay: '2026-11-02' }, '2026-11-02')).toBe(4);
  expect(displayStreak({ streak: 4, lastStudyDay: '2026-11-01' }, '2026-11-02')).toBe(4);
  expect(displayStreak({ streak: 4, lastStudyDay: '2026-10-31' }, '2026-11-02')).toBe(0);
  expect(displayStreak({ streak: 0, lastStudyDay: null }, '2026-11-02')).toBe(0);
});
