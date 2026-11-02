import type { Dataset, Entry, LoadedEntry, Mode } from '../types';
import { buildChoices } from './distractors';
import { makeRng } from './random';

export const STAGE_SIZE = 100;
const JUKUGO_TYPES = ['二字熟語', '和語', '四字熟語', 'ことわざ'];
const POS_VALUES = ['名詞', '動詞', '形容詞', '副詞', 'その他'];
const LEVELS = [1, 2, 3];
const ID_PREFIX: Record<Mode, string> = { jukugo: 'jk', english: 'en' };

export function buildDataset(stages: Entry[][]): Dataset {
  const entries: LoadedEntry[] = stages.flatMap((list, i) => list.map((e) => ({ ...e, stage: i + 1 })));
  const byId = new Map(entries.map((e) => [e.id, e]));
  return { entries, byId, stageCount: stages.length };
}

function isNonEmptyString(x: unknown): x is string {
  return typeof x === 'string' && x.trim() !== '';
}

export function validateDataset(mode: Mode, stages: Entry[][], opts: { requireFull?: boolean } = {}): string[] {
  const errors: string[] = [];
  const all = stages.flat();
  const prefix = ID_PREFIX[mode];
  const idPattern = new RegExp(`^${prefix}-\\d{4}$`);

  if (opts.requireFull) {
    stages.forEach((list, i) => {
      if (list.length !== STAGE_SIZE) errors.push(`ステージ${i + 1}: ${STAGE_SIZE}語ではありません（${list.length}語）`);
    });
  }

  const seenIds = new Set<string>();
  const seenWords = new Set<string>();
  all.forEach((e, i) => {
    const r = e as unknown as Record<string, unknown>;
    const tag = isNonEmptyString(r.id) ? r.id : `#${i + 1}`;

    if (!isNonEmptyString(r.id) || !idPattern.test(r.id)) {
      errors.push(`${tag}: IDの形式が正しくありません（${prefix}-0000 形式）`);
    } else {
      const expected = `${prefix}-${String(i + 1).padStart(4, '0')}`;
      if (r.id !== expected) errors.push(`${tag}: IDが連番になっていません（期待値 ${expected}）`);
    }
    if (isNonEmptyString(r.id)) {
      if (seenIds.has(r.id)) errors.push(`${tag}: IDが重複しています`);
      seenIds.add(r.id);
    }

    const required = mode === 'jukugo' ? ['word', 'reading', 'meaning'] : ['word', 'meaning'];
    required.forEach((k) => {
      if (!isNonEmptyString(r[k])) errors.push(`${tag}: ${k} が空です`);
    });
    if (isNonEmptyString(r.word)) {
      if (seenWords.has(r.word)) errors.push(`${tag}: 見出し語「${r.word}」が重複しています`);
      seenWords.add(r.word);
    }
    if (!LEVELS.includes(r.level as number)) errors.push(`${tag}: level の値が不正です（${String(r.level)}）`);
    if (mode === 'jukugo' && !JUKUGO_TYPES.includes(r.type as string)) {
      errors.push(`${tag}: type の値が不正です（${String(r.type)}）`);
    }
    if (mode === 'english' && !POS_VALUES.includes(r.pos as string)) {
      errors.push(`${tag}: pos の値が不正です（${String(r.pos)}）`);
    }
    if (!Array.isArray(r.confusers)) errors.push(`${tag}: confusers が配列ではありません`);
    if (!Array.isArray(r.synonyms)) errors.push(`${tag}: synonyms が配列ではありません`);
  });

  const byId = new Map(all.map((e) => [e.id, e]));
  all.forEach((e) => {
    const confusers = Array.isArray(e.confusers) ? e.confusers : [];
    const synonyms = Array.isArray(e.synonyms) ? e.synonyms : [];
    for (const [field, refs] of [['confusers', confusers], ['synonyms', synonyms]] as const) {
      refs.forEach((ref) => {
        if (ref === e.id) errors.push(`${e.id}: ${field} に自分自身が入っています`);
        else if (!byId.has(ref)) errors.push(`${e.id}: ${field} の ${ref} は存在しません`);
      });
    }
    confusers.filter((c) => synonyms.includes(c)).forEach((c) => {
      errors.push(`${e.id}: ${c} が confusers と synonyms の両方に入っています`);
    });
    synonyms.forEach((s) => {
      const other = byId.get(s);
      if (other && Array.isArray(other.synonyms) && !other.synonyms.includes(e.id)) {
        errors.push(`${s}: ${e.id} と同義語が双方向になっていません`);
      }
    });
  });

  const ds = buildDataset(stages);
  all.forEach((e) => {
    try {
      buildChoices(mode, e.id, ds, makeRng(1));
    } catch {
      errors.push(`${e.id}: 選択肢を作るための誤答の候補が足りません`);
    }
  });

  return errors;
}
