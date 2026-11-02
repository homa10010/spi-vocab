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
  const raw: Pick<StageInfo, 'stage' | 'total' | 'seen' | 'correctNow'>[] = [];
  for (let stage = 1; stage <= ds.stageCount; stage++) {
    const words = ds.entries.filter((e) => e.stage === stage);
    const seen = words.filter((e) => isSeen(progress[e.id])).length;
    const correctNow = words.filter((e) => isSeen(progress[e.id]) && progress[e.id].lastCorrect).length;
    raw.push({ stage, total: words.length, seen, correctNow });
  }
  const infos: StageInfo[] = [];
  raw.forEach((r, i) => {
    // 一度クリアして次のステージに進んだら、復習で正答率が下がってもクリアのまま扱う
    const movedOn = (raw[i + 1]?.seen ?? 0) > 0;
    const cleared = isCleared(r) || movedOn;
    // 前のステージをクリアするか、前のステージの語を全部出し終えたら開く
    const unlocked = i === 0 || infos[i - 1].cleared || raw[i - 1].seen === raw[i - 1].total;
    infos.push({ ...r, accuracy: r.total ? r.correctNow / r.total : 0, cleared, unlocked });
  });
  return infos;
}

export function currentNewStage(infos: StageInfo[]): number | null {
  return infos.find((i) => i.unlocked && i.seen < i.total)?.stage ?? null;
}

export function clearedCount(infos: StageInfo[]): number {
  return infos.filter((i) => i.cleared).length;
}
