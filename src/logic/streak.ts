import type { Stats } from '../types';
import { diffDays } from './day';

type StreakPart = Pick<Stats, 'streak' | 'lastStudyDay'>;

export function recordStudy<T extends StreakPart>(stats: T, today: string): T {
  if (stats.lastStudyDay === today) return stats;
  const continued = stats.lastStudyDay !== null && diffDays(today, stats.lastStudyDay) === 1;
  return { ...stats, streak: continued ? stats.streak + 1 : 1, lastStudyDay: today };
}

export function displayStreak(stats: StreakPart, today: string): number {
  if (stats.lastStudyDay === null) return 0;
  return diffDays(today, stats.lastStudyDay) <= 1 ? stats.streak : 0;
}
