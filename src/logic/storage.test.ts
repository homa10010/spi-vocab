import type { SaveData } from '../types';
import {
  CORRUPT_KEY, STORAGE_KEY, defaultSave, exportBackup, isSaveData, loadSave, parseBackup, writeSave,
} from './storage';

const sample = (): SaveData => ({
  ...defaultSave(),
  settings: { newPerDay: 30, iosGuideSeen: true },
  progress: {
    jukugo: { 'jk-0001': { box: 2, due: '2026-11-05', correct: 2, wrong: 0, lastCorrect: true, weak: false } },
    english: {},
  },
  stats: { streak: 3, lastStudyDay: '2026-11-02' },
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
    settings: { newPerDay: 20, iosGuideSeen: false },
    progress: { jukugo: {}, english: {} },
    stats: { streak: 0, lastStudyDay: null },
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
