import type { Stats } from '../types';
import { diffDays } from './day';

export function recordStudy(stats: Stats, today: string): Stats {
  if (stats.lastStudyDay === today) return stats;
  const continued = stats.lastStudyDay !== null && diffDays(today, stats.lastStudyDay) === 1;
  return { streak: continued ? stats.streak + 1 : 1, lastStudyDay: today };
}

export function displayStreak(stats: Stats, today: string): number {
  if (stats.lastStudyDay === null) return 0;
  return diffDays(today, stats.lastStudyDay) <= 1 ? stats.streak : 0;
}
