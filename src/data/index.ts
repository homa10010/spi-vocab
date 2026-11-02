import type { Dataset, Entry, Mode } from '../types';
import { buildDataset } from '../logic/validate';

function load(files: Record<string, Entry[]>): Dataset {
  const stages = Object.keys(files)
    .sort()
    .map((k) => files[k]);
  return buildDataset(stages);
}

export const DATASETS: Record<Mode, Dataset> = {
  jukugo: load(import.meta.glob<Entry[]>('./jukugo/stage-*.json', { eager: true, import: 'default' })),
  english: load(import.meta.glob<Entry[]>('./english/stage-*.json', { eager: true, import: 'default' })),
};
