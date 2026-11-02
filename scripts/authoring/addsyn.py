"""同義語の組をまとめて登録する（最初の語のTSV行の同義語列に追記）。
使い方: python3 scripts/authoring/addsyn.py english "acclaim=admire" "erase=cancel" ...
"""
import pathlib, sys
here = pathlib.Path(__file__).resolve().parent
mode, pairs = sys.argv[1], [p.split('=') for p in sys.argv[2:]]
files = sorted(here.glob(f'{mode}-*.tsv'))
rows = {f: [l.split('\t') for l in f.read_text(encoding='utf-8').splitlines()] for f in files}
for a, b in pairs:
    for f, rs in rows.items():
        hit = [r for r in rs if r[0] == a]
        if hit:
            r = hit[0]
            r += [''] * (5 - len(r))
            syn = [x for x in r[4].split(',') if x]
            if b not in syn:
                syn.append(b)
            r[4] = ','.join(syn)
            break
    else:
        sys.exit(f'見つからない語: {a}')
for f, rs in rows.items():
    f.write_text('\n'.join('\t'.join(r).rstrip('\t') for r in rs) + '\n', encoding='utf-8')
print(f'{len(pairs)}組を追加')
