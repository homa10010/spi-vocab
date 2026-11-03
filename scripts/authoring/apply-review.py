"""見直し結果（.review/out-*.json）をTSVに反映し、JSONを作り直す。

out-*.json の形:
{"mode": "jukugo"|"english",
 "fixes": [{"word": 語, "field": "reading"|"pos"|"meaning", "new": 新しい値, "reason": 理由}],
 "synonyms": [{"a": 語, "b": 語, "reason": 理由}],
 "remove_confusers": [{"word": 語, "confuser": 語, "reason": 理由}],
 "notes": [{"word": 語, "issue": 内容}]}
"""
import json, pathlib, subprocess, sys
here = pathlib.Path(__file__).resolve().parent
review = here.parents[1] / '.review'
COL = {'reading': 1, 'pos': 1, 'meaning': 2}
log, problems = [], []
tsvs = {}
def rows(mode):
    if mode not in tsvs:
        tsvs[mode] = {f: [l.split('\t') for l in f.read_text(encoding='utf-8').splitlines() if l.strip()] for f in sorted(here.glob(f'{mode}-*.tsv'))}
    return tsvs[mode]
def find(mode, word):
    for f, rs in rows(mode).items():
        for r in rs:
            if r[0].split('|')[0] == word:
                while len(r) < 5:
                    r.append('')
                return r
    return None
for p in sorted(review.glob('out-*.json')):
    d = json.loads(p.read_text(encoding='utf-8'))
    mode = d['mode']
    for fx in d.get('fixes', []):
        r = find(mode, fx['word'])
        if not r or fx['field'] not in COL:
            problems.append(f"{p.name}: 修正できない {fx}"); continue
        old = r[COL[fx['field']]]
        r[COL[fx['field']]] = fx['new']
        log.append(f"{mode}\t{fx['word']}\t{fx['field']}\t{old} → {fx['new']}\t{fx.get('reason','')}")
    for rc in d.get('remove_confusers', []):
        r = find(mode, rc['word'])
        if not r:
            problems.append(f"{p.name}: 語が見つからない {rc}"); continue
        cs = [c for c in r[3].split(',') if c and c != rc['confuser']]
        r[3] = ','.join(cs)
        log.append(f"{mode}\t{rc['word']}\t紛らわしい語から外す\t{rc['confuser']}\t{rc.get('reason','')}")
    for sy in d.get('synonyms', []):
        ra, rb = find(mode, sy['a']), find(mode, sy['b'])
        if not ra or not rb:
            problems.append(f"{p.name}: 同義語の語が見つからない {sy}"); continue
        for x, y, ry in ((ra, sy['b'], rb), (rb, sy['a'], ra)):
            x[3] = ','.join(c for c in x[3].split(',') if c and c != y)
        if sy['b'] not in ra[4].split(','):
            ra[4] = ','.join(s for s in [ra[4], sy['b']] if s)
        log.append(f"{mode}\t{sy['a']} = {sy['b']}\t同義語\t\t{sy.get('reason','')}")
    for n in d.get('notes', []):
        log.append(f"{mode}\t{n.get('word','')}\t要判断\t\t{n.get('issue','')}")
for mode, fs in tsvs.items():
    for f, rs in fs.items():
        f.write_text('\n'.join('\t'.join(r).rstrip('\t') for r in rs) + '\n', encoding='utf-8')
(review / 'applied.tsv').write_text('\n'.join(log) + '\n', encoding='utf-8')
print(f'反映: {len(log)}件 / 反映できず: {len(problems)}件')
for x in problems:
    print('  ', x)
subprocess.run([sys.executable, str(here / 'normalize-synonyms.py')], check=True)
r = subprocess.run([sys.executable, str(here / 'rebuild.py')], capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip())
