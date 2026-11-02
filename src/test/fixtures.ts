import type { EnglishEntry, JukugoEntry } from '../types';

export const jk = (n: number, o: Partial<JukugoEntry> = {}): JukugoEntry => ({
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

export const en = (n: number, o: Partial<EnglishEntry> = {}): EnglishEntry => ({
  id: `en-${String(n).padStart(4, '0')}`,
  word: `word${n}`,
  pos: '動詞',
  meaning: `訳${n}`,
  level: 1,
  confusers: [],
  synonyms: [],
  ...o,
});

export const range = <T>(count: number, f: (n: number) => T): T[] =>
  Array.from({ length: count }, (_, i) => f(i + 1));

export const id = (prefix: 'jk' | 'en', n: number) => `${prefix}-${String(n).padStart(4, '0')}`;
