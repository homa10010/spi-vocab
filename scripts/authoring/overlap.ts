// 指定ステージの語について、同じモード内で「意味が似すぎていて、誤答に出ると正解が2つに見える」
// おそれのある組を洗い出す（同義語として登録済みの組は除く）。
// 使い方: npx tsx scripts/authoring/overlap.ts jukugo 5 6 7
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Entry, Mode } from '../../src/types';
import { buildDataset } from '../../src/logic/validate';

const [mode, ...stageArgs] = process.argv.slice(2) as [Mode, ...string[]];
const stages = new Set(stageArgs.map(Number));
const dir = join(import.meta.dirname, '..', '..', 'src', 'data', mode);
const ds = buildDataset(readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Entry[]));

const STOP = /[、。・（）()〜～\s]|こと|もの|する|さま|ない|ある|いる|など|また|ような|ように|して|られる|物事|はっきり|そのまま|いろいろ|ほかの|自分|相手/g;
const grams = (s: string) => {
  const t = s.replace(STOP, '');
  const out = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
};
const group = (e: Entry) => ('type' in e ? e.type : e.pos);
const g = new Map(ds.entries.map((e) => [e.id, grams(e.meaning)]));
const THRESHOLD = Number(process.env.OVERLAP ?? 0.34);

const hits: [number, string][] = [];
for (const a of ds.entries.filter((e) => stages.has(e.stage))) {
  for (const b of ds.entries) {
    if (a.id === b.id || a.synonyms.includes(b.id) || group(a) !== group(b)) continue;
    if (stages.has(b.stage) && b.id < a.id) continue;
    const A = g.get(a.id)!, B = g.get(b.id)!;
    if (!A.size || !B.size) continue;
    let inter = 0;
    A.forEach((x) => B.has(x) && inter++);
    const score = inter / Math.min(A.size, B.size);
    if (score >= THRESHOLD) hits.push([score, `${a.word}（${a.meaning}）⇔ ${b.word}（${b.meaning}）`]);
  }
}
hits.sort((x, y) => y[0] - x[0]).forEach(([s, t]) => console.log(s.toFixed(2), t));
console.log(`${hits.length}組`);
