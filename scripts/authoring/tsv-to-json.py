"""作成用TSVをステージJSONに変換する。

使い方:
  python3 scripts/authoring/tsv-to-json.py jukugo scripts/authoring/jukugo-01.tsv 1 --type 二字熟語 --level 1
  python3 scripts/authoring/tsv-to-json.py english scripts/authoring/english-01.tsv 1 --level 1

TSVの列:
  熟語   : 語, 読み, 意味, 紛らわしい語（カンマ区切り）, 同義語（カンマ区切り・省略可）
  英単語 : 語, 品詞, 意味, 紛らわしい語, 同義語（省略可）
紛らわしい語・同義語は「語」で書く。既存ステージの語も参照できる。
同義語は片方に書けば、両方向に自動で入る（既存ステージ側のファイルも更新する）。
行末に「|レベル」を付けた語は、そのレベルにする（例: 語の列が「矜持|3」）。
"""
import argparse, json, pathlib, sys

ap = argparse.ArgumentParser()
ap.add_argument('mode', choices=['jukugo', 'english'])
ap.add_argument('tsv')
ap.add_argument('stage', type=int)
ap.add_argument('--type', default='二字熟語')
ap.add_argument('--level', type=int, default=1)
a = ap.parse_args()

root = pathlib.Path(__file__).resolve().parents[2] / 'src' / 'data' / a.mode
prefix = 'jk' if a.mode == 'jukugo' else 'en'
others = {}
for f in sorted(root.glob('stage-*.json')):
    n = int(f.stem.split('-')[1])
    if n != a.stage:
        others[f] = json.loads(f.read_text(encoding='utf-8'))
start = sum(len(v) for f, v in others.items() if int(f.stem.split('-')[1]) < a.stage)

rows = [l.split('\t') for l in pathlib.Path(a.tsv).read_text(encoding='utf-8').splitlines() if l.strip()]
entries = []
for i, r in enumerate(rows):
    r += [''] * (5 - len(r))
    word, second, meaning, conf, syn = [c.strip() for c in r[:5]]
    level = a.level
    if '|' in word:
        word, lv = word.split('|')
        level = int(lv)
    e = {'id': f'{prefix}-{start + i + 1:04d}'}
    if a.mode == 'jukugo':
        e.update(type=a.type, word=word, reading=second)
    else:
        e.update(word=word, pos=second)
    e.update(meaning=meaning, level=level, confusers=[c for c in conf.split(',') if c], synonyms=[s for s in syn.split(',') if s])
    entries.append(e)

by_word = {e['word']: e for v in others.values() for e in v}
by_word.update({e['word']: e for e in entries})
missing = []
def resolve(words):
    out = []
    for w in words:
        if w not in by_word:
            missing.append(w)
        else:
            out.append(by_word[w]['id'])
    return out
for e in entries:
    e['confusers'] = resolve(e['confusers'])
    e['synonyms'] = resolve(e['synonyms'])
if missing:
    sys.exit('見つからない語: ' + ', '.join(sorted(set(missing))))

by_id = {e['id']: e for e in by_word.values()}
for e in entries:
    for s in e['synonyms']:
        if e['id'] not in by_id[s]['synonyms']:
            by_id[s]['synonyms'].append(e['id'])
# 同義語は誤答に出してはいけないので、紛らわしい語からは外す（同義語が優先）
for e in by_id.values():
    e['confusers'] = [c for c in e['confusers'] if c not in e['synonyms']]

def dump(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
dump(root / f'stage-{a.stage:02d}.json', entries)
for f, v in others.items():
    dump(f, v)
print(f'{len(entries)}語を書き出しました: {root / f"stage-{a.stage:02d}.json"}')
