import type { SaveData } from '../types';

export const STORAGE_KEY = 'spi-vocab-progress-v1';
export const CORRUPT_KEY = 'spi-vocab-progress-v1-corrupt';
export type LoadWarning = 'corrupt' | 'unavailable' | null;

export function defaultSave(): SaveData {
  return {
    version: 1,
    settings: { newPerDay: 20, iosGuideSeen: false },
    progress: { jukugo: {}, english: {} },
    stats: { streak: 0, lastStudyDay: null },
    session: null,
  };
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isBool = (x: unknown): x is boolean => typeof x === 'boolean';
const MODES = ['jukugo', 'english'];

function isProgress(x: unknown): boolean {
  return isObj(x) && isNum(x.box) && isStr(x.due) && isNum(x.correct) && isNum(x.wrong) && isBool(x.lastCorrect) && isBool(x.weak) && (x.firstDay === undefined || isStr(x.firstDay));
}

function isSession(x: unknown): boolean {
  if (x === null) return true;
  if (!isObj(x)) return false;
  return (
    MODES.includes(x.mode as string) &&
    ['daily', 'stage', 'weak'].includes(x.kind as string) &&
    (x.stage === null || isNum(x.stage)) &&
    isStr(x.day) &&
    isNum(x.index) &&
    (x.answeredChoice === null || isStr(x.answeredChoice)) &&
    Array.isArray(x.queue) &&
    x.queue.every((q) => isObj(q) && isStr(q.id) && Array.isArray(q.choices) && q.choices.every(isStr) && isBool(q.requeue)) &&
    Array.isArray(x.results) &&
    x.results.every((r) => isObj(r) && isStr(r.id) && isBool(r.correct))
  );
}

export function isSaveData(x: unknown): x is SaveData {
  if (!isObj(x) || x.version !== 1) return false;
  const { settings, progress, stats } = x;
  if (!isObj(settings) || ![10, 20, 30].includes(settings.newPerDay as number) || !isBool(settings.iosGuideSeen)) return false;
  if (!isObj(progress) || !MODES.every((m) => isObj(progress[m]) && Object.values(progress[m] as object).every(isProgress))) return false;
  if (!isObj(stats) || !isNum(stats.streak) || !(stats.lastStudyDay === null || isStr(stats.lastStudyDay))) return false;
  return isSession(x.session);
}

export function loadSave(storage: Storage | null): { save: SaveData; warning: LoadWarning } {
  if (!storage) return { save: defaultSave(), warning: 'unavailable' };
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { save: defaultSave(), warning: 'unavailable' };
  }
  if (raw === null) return { save: defaultSave(), warning: null };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isSaveData(parsed)) return { save: parsed, warning: null };
  } catch {
    // 下で退避する
  }
  try {
    storage.setItem(CORRUPT_KEY, raw);
  } catch {
    // 退避できなくても起動は続ける
  }
  return { save: defaultSave(), warning: 'corrupt' };
}

export function writeSave(storage: Storage | null, save: SaveData): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function exportBackup(save: SaveData): string {
  return JSON.stringify(save, null, 2);
}

export function parseBackup(text: string): { ok: true; save: SaveData } | { ok: false; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'ファイルの形式が正しくありません' };
  }
  if (isObj(parsed) && isNum(parsed.version) && parsed.version > 1) {
    return { ok: false, reason: '新しい版のアプリで作られたバックアップです' };
  }
  if (!isSaveData(parsed)) return { ok: false, reason: 'バックアップの中身が壊れています' };
  return { ok: true, save: { ...parsed, session: null } };
}
