import type { EnglishEntry, JukugoEntry } from '../types';
import { buildDataset, validateDataset } from './validate';

const jk = (n: number, o: Partial<JukugoEntry> = {}): JukugoEntry => ({
  id: `jk-${String(n).padStart(4, '0')}`,
  type: '二字熟語',
  word: `語${n}`,
  reading: `ご${n}`,
  meaning: `意味${n}`,
  level: 1,
  confusers: [],
  synonyms: [],
  ...o,
});
const en = (n: number, o: Partial<EnglishEntry> = {}): EnglishEntry => ({
  id: `en-${String(n).padStart(4, '0')}`,
  word: `word${n}`,
  pos: '動詞',
  meaning: `訳${n}`,
  level: 1,
  confusers: [],
  synonyms: [],
  ...o,
});
const range = <T>(count: number, f: (n: number) => T): T[] => Array.from({ length: count }, (_, i) => f(i + 1));

test('buildDataset は stage を添字+1で付ける', () => {
  const ds = buildDataset([[jk(1)], [jk(2)]]);
  expect(ds.stageCount).toBe(2);
  expect(ds.byId.get('jk-0002')?.stage).toBe(2);
  expect(ds.entries.map((e) => e.id)).toEqual(['jk-0001', 'jk-0002']);
});

test('正しいデータではエラーなし', () => {
  expect(validateDataset('jukugo', [range(10, (n) => jk(n))])).toEqual([]);
  expect(validateDataset('english', [range(10, (n) => en(n))])).toEqual([]);
});

test('IDの重複を検出', () => {
  const errs = validateDataset('jukugo', [[jk(1), jk(2), { ...jk(3), id: 'jk-0002' }, jk(4), jk(5), jk(6)]]);
  expect(errs.some((e) => e.includes('jk-0002') && e.includes('重複'))).toBe(true);
});

test('見出し語の重複を検出', () => {
  const errs = validateDataset('jukugo', [[...range(5, (n) => jk(n)), jk(6, { word: '語1' })]]);
  expect(errs.some((e) => e.includes('語1') && e.includes('重複'))).toBe(true);
});

test('必須項目の空文字・不正な値を検出', () => {
  const errs = validateDataset('jukugo', [[...range(5, (n) => jk(n)), jk(6, { meaning: '' })]]);
  expect(errs.some((e) => e.includes('jk-0006') && e.includes('meaning'))).toBe(true);
  const errs2 = validateDataset('english', [[...range(5, (n) => en(n)), en(6, { pos: '助詞' as never })]]);
  expect(errs2.some((e) => e.includes('en-0006') && e.includes('pos'))).toBe(true);
  const errs3 = validateDataset('jukugo', [[...range(5, (n) => jk(n)), jk(6, { level: 4 as never })]]);
  expect(errs3.some((e) => e.includes('jk-0006') && e.includes('level'))).toBe(true);
  const errs4 = validateDataset('jukugo', [[...range(5, (n) => jk(n)), jk(6, { type: '三字熟語' as never })]]);
  expect(errs4.some((e) => e.includes('jk-0006') && e.includes('type'))).toBe(true);
});

test('ID形式の違反と連番の欠けを検出', () => {
  const errs = validateDataset('jukugo', [[...range(5, (n) => jk(n)), { ...jk(6), id: 'en-0006' }]]);
  expect(errs.some((e) => e.includes('en-0006') && e.includes('形式'))).toBe(true);
  const errs2 = validateDataset('jukugo', [[...range(5, (n) => jk(n)), jk(7)]]);
  expect(errs2.some((e) => e.includes('jk-0007') && e.includes('連番'))).toBe(true);
});

test('存在しないID・自分自身への参照を検出', () => {
  const errs = validateDataset('jukugo', [[jk(1, { confusers: ['jk-9999'] }), ...range(5, (n) => jk(n + 1))]]);
  expect(errs.some((e) => e.includes('jk-0001') && e.includes('jk-9999'))).toBe(true);
  const errs2 = validateDataset('jukugo', [[jk(1, { confusers: ['jk-0001'] }), ...range(5, (n) => jk(n + 1))]]);
  expect(errs2.some((e) => e.includes('jk-0001') && e.includes('自分自身'))).toBe(true);
});

test('confusers と synonyms の両方にある語を検出', () => {
  const errs = validateDataset('jukugo', [[
    jk(1, { confusers: ['jk-0002'], synonyms: ['jk-0002'] }),
    jk(2, { synonyms: ['jk-0001'] }),
    ...range(4, (n) => jk(n + 2)),
  ]]);
  expect(errs.some((e) => e.includes('jk-0001') && e.includes('両方'))).toBe(true);
});

test('片方向の synonyms を検出', () => {
  const errs = validateDataset('jukugo', [[jk(1, { synonyms: ['jk-0002'] }), ...range(5, (n) => jk(n + 1))]]);
  expect(errs.some((e) => e.includes('jk-0002') && e.includes('双方向'))).toBe(true);
});

test('requireFull のとき100語でないファイルを検出', () => {
  const errs = validateDataset('jukugo', [range(10, (n) => jk(n))], { requireFull: true });
  expect(errs.some((e) => e.includes('ステージ1') && e.includes('100'))).toBe(true);
  expect(validateDataset('jukugo', [range(100, (n) => jk(n))], { requireFull: true })).toEqual([]);
});
