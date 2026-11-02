import { makeRng, shuffle } from './random';

test('同じseedなら同じ乱数列', () => {
  const a = makeRng(42);
  const b = makeRng(42);
  const xs = [a(), a(), a()];
  expect([b(), b(), b()]).toEqual(xs);
  xs.forEach((x) => {
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(1);
  });
});

test('shuffle は元配列を変えず、要素の集合は同じ', () => {
  const src = [1, 2, 3, 4, 5, 6, 7, 8];
  const out = shuffle(src, makeRng(1));
  expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  expect([...out].sort((x, y) => x - y)).toEqual(src);
});

test('shuffle は seed が同じなら同じ並び', () => {
  expect(shuffle([1, 2, 3, 4, 5], makeRng(7))).toEqual(shuffle([1, 2, 3, 4, 5], makeRng(7)));
});
