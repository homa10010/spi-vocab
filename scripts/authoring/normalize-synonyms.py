"""同義語の書き場所を整える。
TSVの同義語列に、manifest.tsv で後のステージにある語が書かれていると、変換の時点ではまだその語がなく失敗する。
そうした同義語は後の語の行に移す（変換時に両方向へ自動で書き足されるので、意味は変わらない）。
"""
import pathlib
here = pathlib.Path(__file__).resolve().parent
man = [l.split('\t') for l in (here / 'manifest.tsv').read_text(encoding='utf-8').splitlines() if l.strip()]
moved = 0
for mode in ('jukugo', 'english'):
    files = [here / r[2] for r in man if r[0] == mode]
    rows = {f: [l.split('\t') for l in f.read_text(encoding='utf-8').splitlines() if l.strip()] for f in files}
    pos = {}
    for i, f in enumerate(files):
        for r in rows[f]:
            while len(r) < 5:
                r.append('')
            pos[r[0].split('|')[0]] = (i, r)
    for i, f in enumerate(files):
        for r in rows[f]:
            keep = []
            for s in [x for x in r[4].split(',') if x]:
                if s in pos and pos[s][0] > i:
                    other, me = pos[s][1], r[0].split('|')[0]
                    if me not in other[4].split(','):
                        other[4] = ','.join(x for x in [other[4], me] if x)
                    moved += 1
                else:
                    keep.append(s)
            r[4] = ','.join(keep)
    for f in files:
        f.write_text('\n'.join('\t'.join(r).rstrip('\t') for r in rows[f]) + '\n', encoding='utf-8')
print(f'同義語の書き場所を移動: {moved}件')
