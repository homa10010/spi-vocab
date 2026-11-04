import { pruneHistory, recordHistory, series, todayAccuracy } from './history';

test('回答を日付・モードごとに数える', () => {
  let h = recordHistory({}, 'jukugo', '2026-11-04', true);
  h = recordHistory(h, 'jukugo', '2026-11-04', false);
  h = recordHistory(h, 'english', '2026-11-04', true);
  expect(h).toEqual({ '2026-11-04': { jukugo: { correct: 1, total: 2 }, english: { correct: 1, total: 1 } } });
});

test('今日の正答率は％（整数）、まだ解いていなければ null', () => {
  const h = { '2026-11-04': { jukugo: { correct: 2, total: 3 } } };
  expect(todayAccuracy(h, 'jukugo', '2026-11-04')).toBe(67);
  expect(todayAccuracy(h, 'english', '2026-11-04')).toBeNull();
  expect(todayAccuracy(h, 'jukugo', '2026-11-05')).toBeNull();
});

test('series は今日を最後に指定日数ぶん並べ、学習しなかった日は null', () => {
  const h = {
    '2026-11-02': { jukugo: { correct: 1, total: 2 } },
    '2026-11-04': { english: { correct: 3, total: 4 }, jukugo: { correct: 4, total: 4 } },
  };
  expect(series(h, '2026-11-04', 3)).toEqual({
    days: ['2026-11-02', '2026-11-03', '2026-11-04'],
    jukugo: [50, null, 100],
    english: [null, null, 75],
  });
  expect(series(h, '2026-11-04', 30).days).toHaveLength(30);
});

test('62日より古い記録は消す', () => {
  const h = { '2026-08-01': { jukugo: { correct: 1, total: 1 } }, '2026-11-01': { jukugo: { correct: 1, total: 1 } } };
  expect(Object.keys(pruneHistory(h, '2026-11-04'))).toEqual(['2026-11-01']);
});
