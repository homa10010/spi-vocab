import type { SaveData } from '../types';
import {
  CORRUPT_KEY, STORAGE_KEY, defaultSave, exportBackup, isSaveData, loadSave, parseBackup, writeSave,
} from './storage';

const sample = (): SaveData => ({
  ...defaultSave(),
  settings: { ...defaultSave().settings, newPerDay: 30, iosGuideSeen: true },
  progress: {
    jukugo: { 'jk-0001': { box: 2, due: '2026-11-05', correct: 2, wrong: 0, lastCorrect: true, weak: false } },
    english: {},
  },
  stats: { streak: 3, lastStudyDay: '2026-11-02', history: { '2026-11-02': { jukugo: { correct: 1, total: 2 } } } },
  session: {
    mode: 'jukugo', kind: 'daily', stage: null, day: '2026-11-02',
    queue: [{ id: 'jk-0001', choices: ['jk-0001'], requeue: false }], index: 0, answeredChoice: null, results: [],
  },
});

const throwing = (): Storage =>
  ({
    getItem: () => { throw new Error('denied'); },
    setItem: () => { throw new Error('denied'); },
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  }) as Storage;

beforeEach(() => localStorage.clear());

test('初期値', () => {
  expect(defaultSave()).toEqual({
    version: 1,
    settings: {
      newPerDay: 20, iosGuideSeen: false,
      randomTypes: ['二字熟語', '和語', '四字熟語', 'ことわざ'], randomLevels: [1, 2, 3],
      themeMode: 'light', accent: 'ai',
    },
    progress: { jukugo: {}, english: {} },
    stats: { streak: 0, lastStudyDay: null, history: {} },
    session: null,
  });
  expect(STORAGE_KEY).toBe('spi-vocab-progress-v1');
  expect(CORRUPT_KEY).toBe('spi-vocab-progress-v1-corrupt');
});

test('値がなければ初期状態・警告なし', () => {
  expect(loadSave(localStorage)).toEqual({ save: defaultSave(), warning: null });
});

test('保存して読み直すと同じ', () => {
  expect(writeSave(localStorage, sample())).toBe(true);
  expect(loadSave(localStorage)).toEqual({ save: sample(), warning: null });
});

test('壊れたJSONは退避して初期状態・corrupt', () => {
  localStorage.setItem(STORAGE_KEY, '{broken');
  expect(loadSave(localStorage)).toEqual({ save: defaultSave(), warning: 'corrupt' });
  expect(localStorage.getItem(CORRUPT_KEY)).toBe('{broken');
});

test('構造が違うデータも corrupt', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, settings: 'x' }));
  expect(loadSave(localStorage).warning).toBe('corrupt');
});

test('storage が null なら unavailable', () => {
  expect(loadSave(null)).toEqual({ save: defaultSave(), warning: 'unavailable' });
  expect(writeSave(null, sample())).toBe(false);
});

test('getItem が例外なら unavailable で落ちない', () => {
  expect(loadSave(throwing())).toEqual({ save: defaultSave(), warning: 'unavailable' });
});

test('setItem が例外なら writeSave は false', () => {
  expect(writeSave(throwing(), sample())).toBe(false);
});

test('バックアップの往復で同じ内容（session は null）', () => {
  const r = parseBackup(exportBackup(sample()));
  expect(r).toEqual({ ok: true, save: { ...sample(), session: null } });
});

test('新しい版のバックアップは拒否', () => {
  expect(parseBackup(JSON.stringify({ ...sample(), version: 2 }))).toEqual({
    ok: false, reason: '新しい版のアプリで作られたバックアップです',
  });
});

test('JSONでないバックアップは拒否', () => {
  expect(parseBackup('hello')).toEqual({ ok: false, reason: 'ファイルの形式が正しくありません' });
});

test('中身が壊れたバックアップは拒否', () => {
  expect(parseBackup(JSON.stringify({ version: 1, progress: [] }))).toEqual({
    ok: false, reason: 'バックアップの中身が壊れています',
  });
});

test('isSaveData は進捗の各項目の型まで見る', () => {
  const bad = sample() as unknown as { progress: { jukugo: Record<string, unknown> } };
  bad.progress.jukugo['jk-0001'] = { box: '2' };
  expect(isSaveData(bad)).toBe(false);
  expect(isSaveData(sample())).toBe(true);
});

test('isSaveData は firstDay の有無どちらも受け付け、型違いは拒否', () => {
  const ok = sample();
  ok.progress.jukugo['jk-0001'].firstDay = '2026-11-01';
  expect(isSaveData(ok)).toBe(true);
  const bad = sample() as unknown as { progress: { jukugo: Record<string, Record<string, unknown>> } };
  bad.progress.jukugo['jk-0001'].firstDay = 5;
  expect(isSaveData(bad)).toBe(false);
});

test('新しい設定項目がない古い保存データも、初期値を補って読める', () => {
  const old = sample() as unknown as { settings: Record<string, unknown>; stats: Record<string, unknown> };
  old.settings = { newPerDay: 30, iosGuideSeen: true };
  old.stats = { streak: 3, lastStudyDay: '2026-11-02' };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(old));
  const { save, warning } = loadSave(localStorage);
  expect(warning).toBeNull();
  expect(save.settings).toEqual({
    newPerDay: 30, iosGuideSeen: true,
    randomTypes: ['二字熟語', '和語', '四字熟語', 'ことわざ'], randomLevels: [1, 2, 3],
    themeMode: 'light', accent: 'ai',
  });
  expect(save.stats.history).toEqual({});
});

test('設定の値が不正なら壊れたデータとして扱う', () => {
  const bad = sample() as unknown as { settings: Record<string, unknown> };
  bad.settings = { ...bad.settings, accent: 'rainbow' };
  expect(isSaveData(bad)).toBe(false);
  const bad2 = sample() as unknown as { settings: Record<string, unknown> };
  bad2.settings = { ...bad2.settings, randomLevels: [4] };
  expect(isSaveData(bad2)).toBe(false);
});
