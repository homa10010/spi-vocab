import type { Dataset, LoadedEntry, Mode, ProgressMap, Session, SessionKind, Settings } from '../types';
import { buildChoices } from './distractors';
import { shuffle, type Rng } from './random';
import { isDue, isSeen } from './srs';
import { currentNewStage, stageInfos } from './stages';

export const REVIEW_LIMIT = 100;
export const PRACTICE_SIZE = 20;

function pickDaily(ds: Dataset, progress: ProgressMap, settings: Settings, today: string) {
  const review = ds.entries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => isDue(progress[e.id], today))
    .sort((a, b) => (progress[a.e.id].due < progress[b.e.id].due ? -1 : progress[a.e.id].due > progress[b.e.id].due ? 1 : a.i - b.i))
    .slice(0, REVIEW_LIMIT)
    .map(({ e }) => e);
  const stage = currentNewStage(stageInfos(ds, progress));
  const freshToday = ds.entries.filter((e) => progress[e.id]?.firstDay === today).length;
  const quota = Math.max(0, settings.newPerDay - freshToday);
  const fresh =
    stage === null
      ? []
      : ds.entries.filter((e) => e.stage === stage && !isSeen(progress[e.id])).slice(0, quota);
  return { review, fresh };
}

function makeSession(
  mode: Mode,
  kind: SessionKind,
  stage: number | null,
  words: LoadedEntry[],
  ds: Dataset,
  today: string,
  rng: Rng,
): Session {
  return {
    mode,
    kind,
    stage,
    day: today,
    queue: shuffle(words, rng).map((e) => ({ id: e.id, choices: buildChoices(mode, e.id, ds, rng), requeue: false })),
    index: 0,
    answeredChoice: null,
    results: [],
  };
}

export function dailyCounts(_mode: Mode, ds: Dataset, progress: ProgressMap, settings: Settings, today: string) {
  const { review, fresh } = pickDaily(ds, progress, settings, today);
  return { review: review.length, fresh: fresh.length };
}

export function buildDailySession(
  mode: Mode, ds: Dataset, progress: ProgressMap, settings: Settings, today: string, rng: Rng,
): Session {
  const { review, fresh } = pickDaily(ds, progress, settings, today);
  return makeSession(mode, 'daily', null, [...review, ...fresh], ds, today, rng);
}

export function buildStagePractice(
  mode: Mode, stage: number, ds: Dataset, progress: ProgressMap, today: string, rng: Rng,
): Session {
  const words = ds.entries.filter((e) => e.stage === stage);
  const unseen = words.filter((e) => !isSeen(progress[e.id]));
  const wrong = words.filter((e) => isSeen(progress[e.id]) && !progress[e.id].lastCorrect);
  const rest = shuffle(words.filter((e) => isSeen(progress[e.id]) && progress[e.id].lastCorrect), rng);
  const picked = [...unseen, ...wrong, ...rest].slice(0, PRACTICE_SIZE);
  return makeSession(mode, 'stage', stage, picked, ds, today, rng);
}

export function buildWeakSession(mode: Mode, ds: Dataset, progress: ProgressMap, today: string, rng: Rng): Session {
  const weak = shuffle(ds.entries.filter((e) => progress[e.id]?.weak), rng).slice(0, PRACTICE_SIZE);
  return makeSession(mode, 'weak', null, weak, ds, today, rng);
}
