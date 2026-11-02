"""manifest.tsv に並んだ順に、全ステージのJSONをTSVから作り直す。
同義語の双方向リンクは後のステージの変換で前のファイルにも書き足されるため、必ず先頭から順に変換する。
使い方: python3 scripts/authoring/rebuild.py
"""
import pathlib, subprocess, sys
here = pathlib.Path(__file__).resolve().parent
data = here.parents[1] / 'src' / 'data'
rows = [l.split('\t') for l in (here / 'manifest.tsv').read_text(encoding='utf-8').splitlines() if l.strip()]
for mode in {r[0] for r in rows}:
    for f in (data / mode).glob('stage-*.json'):
        f.unlink()
for mode, stage, tsv, typ, level in rows:
    args = [sys.executable, str(here / 'tsv-to-json.py'), mode, str(here / tsv), stage, '--level', level]
    if mode == 'jukugo':
        args += ['--type', typ]
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f'{tsv}: {r.stderr or r.stdout}')
print(f'{len(rows)}ステージを作り直しました')
