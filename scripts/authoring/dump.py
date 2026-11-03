"""見直し用の一覧を書き出す。
python3 scripts/authoring/dump.py jukugo 1 5 > out.txt   … ステージ1〜5の語（読み・意味・紛らわしい語・同義語）
python3 scripts/authoring/dump.py jukugo index > idx.txt  … そのモードの全語の索引（種類/品詞・レベル・意味）
"""
import json, pathlib, sys
mode = sys.argv[1]
root = pathlib.Path(__file__).resolve().parents[2] / 'src' / 'data' / mode
files = sorted(root.glob('stage-*.json'))
entries = [dict(e, stage=i + 1) for i, f in enumerate(files) for e in json.loads(f.read_text(encoding='utf-8'))]
by_id = {e['id']: e for e in entries}
w = lambda ids: ','.join(by_id[i]['word'] for i in ids) or '-'
if sys.argv[2] == 'index':
    for e in entries:
        kind = e.get('type') or e.get('pos')
        print(f"{e['word']}｜{kind}｜L{e['level']}｜{e['meaning']}")
else:
    lo, hi = int(sys.argv[2]), int(sys.argv[3])
    for e in entries:
        if lo <= e['stage'] <= hi:
            second = e.get('reading') or e.get('pos')
            kind = e.get('type', '')
            print(f"S{e['stage']}｜{e['word']}｜{second}｜{kind}{'｜' if kind else ''}L{e['level']}｜{e['meaning']}｜紛らわしい語: {w(e['confusers'])}｜同義語: {w(e['synonyms'])}")
