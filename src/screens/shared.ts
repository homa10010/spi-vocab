import type { LoadedEntry } from '../types';
import { makeRng } from '../logic/random';

export const MODE_LABEL = { jukugo: '熟語', english: '英単語' } as const;

export function freshRng() {
  return makeRng((Date.now() ^ Math.floor(Math.random() * 2 ** 31)) >>> 0);
}

/** ステージの見出し（熟語は種類名、英単語はレベル） */
export function stageLabel(words: LoadedEntry[]): string {
  const first = words[0];
  if (!first) return '';
  return 'type' in first ? first.type : `レベル${first.level}`;
}
