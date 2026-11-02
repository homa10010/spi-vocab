import { addDays, dayKey, diffDays } from './day';

test('4時より前は前日', () => {
  expect(dayKey(new Date(2026, 10, 3, 3, 59))).toBe('2026-11-02');
});
test('4時ちょうどは当日', () => {
  expect(dayKey(new Date(2026, 10, 3, 4, 0))).toBe('2026-11-03');
});
test('月初の4時前は前月末', () => {
  expect(dayKey(new Date(2026, 11, 1, 1, 0))).toBe('2026-11-30');
});
test('月またぎ', () => {
  expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
});
test('年またぎ', () => {
  expect(addDays('2026-12-31', 14)).toBe('2027-01-14');
});
test('差分', () => {
  expect(diffDays('2026-11-05', '2026-11-02')).toBe(3);
  expect(diffDays('2026-11-02', '2026-11-05')).toBe(-3);
});
