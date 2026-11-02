import type { WordProgress } from '../types';
import { addDays } from './day';

export const INTERVALS: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };
const MAX_BOX = 5;
const WEAK_CLEAR_BOX = 3;

export function applyAnswer(prev: WordProgress | undefined, correct: boolean, today: string): WordProgress {
  const base = prev ?? { box: 0, due: today, correct: 0, wrong: 0, lastCorrect: false, weak: false };
  const firstDay = prev ? prev.firstDay : today;
  const keepFirst = firstDay === undefined ? {} : { firstDay };
  if (!correct) {
    return {
      box: 1,
      due: addDays(today, INTERVALS[1]),
      correct: base.correct,
      wrong: base.wrong + 1,
      lastCorrect: false,
      weak: true,
      ...keepFirst,
    };
  }
  const box = Math.min(MAX_BOX, base.box + 1) as 1 | 2 | 3 | 4 | 5;
  return {
    box,
    due: addDays(today, INTERVALS[box]),
    correct: base.correct + 1,
    wrong: base.wrong,
    lastCorrect: true,
    weak: base.weak && box < WEAK_CLEAR_BOX,
    ...keepFirst,
  };
}

export function isSeen(p: WordProgress | undefined): boolean {
  return !!p && p.box >= 1;
}

export function isDue(p: WordProgress | undefined, today: string): boolean {
  return isSeen(p) && p!.due <= today;
}
