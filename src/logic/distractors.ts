import type { Dataset, LoadedEntry, Mode } from '../types';
import { shuffle, type Rng } from './random';

export function choiceCount(mode: Mode): number {
  return mode === 'jukugo' ? 5 : 4;
}

function sameGroup(mode: Mode, a: LoadedEntry, b: LoadedEntry): boolean {
  return mode === 'jukugo'
    ? 'type' in a && 'type' in b && a.type === b.type
    : 'pos' in a && 'pos' in b && a.pos === b.pos;
}

/** 正解を含む選択肢IDをシャッフル済みで返す */
export function buildChoices(mode: Mode, targetId: string, ds: Dataset, rng: Rng): string[] {
  const target = ds.byId.get(targetId);
  if (!target) throw new Error(`unknown id: ${targetId}`);
  const need = choiceCount(mode) - 1;
  const excluded = new Set([target.id, ...target.synonyms]);
  const picked: string[] = [];

  const usable = (e: LoadedEntry | undefined): e is LoadedEntry =>
    !!e && !excluded.has(e.id) && e.meaning !== target.meaning && !picked.includes(e.id);

  const tiers: LoadedEntry[][] = [
    target.confusers.map((c) => ds.byId.get(c)).filter((e): e is LoadedEntry => !!e),
    ds.entries.filter((e) => sameGroup(mode, target, e) && e.level === target.level),
    ds.entries.filter((e) => sameGroup(mode, target, e)),
    ds.entries,
  ];

  for (const tier of tiers) {
    for (const e of shuffle(tier, rng)) {
      if (picked.length >= need) break;
      if (usable(e)) picked.push(e.id);
    }
    if (picked.length >= need) break;
  }

  if (picked.length < need) throw new Error(`not enough candidates: ${targetId}`);
  return shuffle([target.id, ...picked], rng);
}
