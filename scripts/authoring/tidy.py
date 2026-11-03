"""データの見直し後に機械的に整える。
熟語  : 種類が違う語（例: 四字熟語の問題に二字熟語）は、字数で答えがわかってしまうので紛らわしい語から外す。
英単語: 同じ品詞で訳語（「、」区切り・括弧を除く）が1つでも同じ組は、両方正解に読めるので同義語にする（後の語の行に書く）。
"""
import pathlib, re, itertools
here = pathlib.Path(__file__).resolve().parent
man = [l.split('\t') for l in (here / 'manifest.tsv').read_text(encoding='utf-8').splitlines() if l.strip()]
def load(mode):
    out = []
    for r in man:
        if r[0] != mode:
            continue
        f = here / r[2]
        rows = [l.split('\t') for l in f.read_text(encoding='utf-8').splitlines() if l.strip()]
        for x in rows:
            while len(x) < 5:
                x.append('')
        out.append((f, r[3], rows))
    return out
def save(files):
    for f, _, rows in files:
        f.write_text('\n'.join('\t'.join(x).rstrip('\t') for x in rows) + '\n', encoding='utf-8')
name = lambda x: x[0].split('|')[0]

jk = load('jukugo')
typ = {name(x): t for _, t, rows in jk for x in rows}
dropped = 0
for _, t, rows in jk:
    for x in rows:
        keep = [c for c in x[3].split(',') if c and typ.get(c, t) == t]
        dropped += len([c for c in x[3].split(',') if c]) - len(keep)
        x[3] = ','.join(keep)
save(jk)

en = load('english')
order, glosses = {}, {}
for i, (_, _, rows) in enumerate(en):
    for x in rows:
        order[name(x)] = (i, x)
        m = re.sub(r'（[^）]*）|\([^)]*\)', '', x[2])
        glosses[name(x)] = {g.strip() for g in re.split('[、,]', m) if g.strip()}
added = 0
by_pos = {}
for w, (_, x) in order.items():
    by_pos.setdefault(x[1], []).append(w)
for pos, ws in by_pos.items():
    idx = {}
    for w in ws:
        for g in glosses[w]:
            idx.setdefault(g, []).append(w)
    for g, group in idx.items():
        for a, b in itertools.combinations(group, 2):
            (ia, ra), (ib, rb) = order[a], order[b]
            later, earlier = (ra, a) if ia >= ib else (rb, b), (rb, b) if ia >= ib else (ra, a)
            later_row, earlier_word = later[0], earlier[1]
            for row, other in ((ra, b), (rb, a)):
                row[3] = ','.join(c for c in row[3].split(',') if c and c != other)
            syns_a, syns_b = set(ra[4].split(',')), set(rb[4].split(','))
            if b in syns_a or a in syns_b:
                continue
            later_row[4] = ','.join(s for s in [later_row[4], earlier_word] if s)
            added += 1
save(en)
print(f'熟語: 種類違いの紛らわしい語を外した {dropped}件 / 英単語: 同じ訳語の組を同義語に {added}件')
