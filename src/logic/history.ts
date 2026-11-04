import type { History, Mode } from '../types';
import { addDays, diffDays } from './day';

export const HISTORY_KEEP_DAYS = 62;

export function recordHistory(h: History, mode: Mode, today: string, correct: boolean): History {
  const day = h[today] ?? {};
  const prev = day[mode] ?? { correct: 0, total: 0 };
  return { ...h, [today]: { ...day, [mode]: { correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 } } };
}

export function pruneHistory(h: History, today: string): History {
  return Object.fromEntries(Object.entries(h).filter(([d]) => diffDays(today, d) < HISTORY_KEEP_DAYS));
}

function pct(h: History, mode: Mode, day: string): number | null {
  const r = h[day]?.[mode];
  return r && r.total > 0 ? Math.round((r.correct / r.total) * 100) : null;
}

export function todayAccuracy(h: History, mode: Mode, today: string): number | null {
  return pct(h, mode, today);
}

/** 今日を最後に days 日ぶんの正答率（％）。学習しなかった日は null */
export function series(h: History, today: string, days: number) {
  const list = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1));
  return { days: list, jukugo: list.map((d) => pct(h, 'jukugo', d)), english: list.map((d) => pct(h, 'english', d)) };
}
