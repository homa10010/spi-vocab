import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Entry, Mode } from '../src/types';
import { validateDataset } from '../src/logic/validate';

const root = join(import.meta.dirname, '..', 'src', 'data');
const modes: Record<Mode, string> = { jukugo: '熟語', english: '英単語' };
let failed = false;

for (const mode of Object.keys(modes) as Mode[]) {
  const dir = join(root, mode);
  const files = readdirSync(dir).filter((f) => /^stage-\d{2}\.json$/.test(f)).sort();
  const stages = files.map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Entry[]);
  const errors = validateDataset(mode, stages, { requireFull: true });
  const count = stages.reduce((n, s) => n + s.length, 0);
  if (errors.length) {
    failed = true;
    console.error(`✗ ${modes[mode]}：${errors.length}件のエラー（${files.length}ステージ・${count}語）`);
    errors.forEach((e) => console.error(`  - ${e}`));
  } else {
    console.log(`✓ ${modes[mode]}：${files.length}ステージ・${count}語`);
  }
}
process.exit(failed ? 1 : 0);
