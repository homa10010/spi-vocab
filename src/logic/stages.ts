import type { Dataset, ProgressMap } from '../types';
import { isSeen } from './srs';

export const CLEAR_RATE = 0.8;

export type StageInfo = {
  stage: number;
  total: number;
  seen: number;
  correctNow: number;
  accuracy: number;
  cleared: boolean;
  unlocked: boolean;
};

export function isCleared(info: Pick<StageInfo, 'total' | 'seen' | 'correctNow'>): boolean {
  return info.total > 0 && info.seen === info.total && info.correctNow / info.total >= CLEAR_RATE;
}

export function stageInfos(ds: Dataset, progress: ProgressMap): StageInfo[] {
  const infos: StageInfo[] = [];
  for (let stage = 1; stage <= ds.stageCount; stage++) {
    const words = ds.entries.filter((e) => e.stage === stage);
    const seen = words.filter((e) => isSeen(progress[e.id])).length;
    const correctNow = words.filter((e) => isSeen(progress[e.id]) && progress[e.id].lastCorrect).length;
    const total = words.length;
    const cleared = isCleared({ total, seen, correctNow });
    const unlocked = stage === 1 || infos[stage - 2].cleared;
    infos.push({ stage, total, seen, correctNow, accuracy: total ? correctNow / total : 0, cleared, unlocked });
  }
  return infos;
}

export function currentNewStage(infos: StageInfo[]): number | null {
  return infos.find((i) => i.unlocked && i.seen < i.total)?.stage ?? null;
}

export function clearedCount(infos: StageInfo[]): number {
  return infos.filter((i) => i.cleared).length;
}
