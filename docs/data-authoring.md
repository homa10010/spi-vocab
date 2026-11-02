# 単語データ作成の手順と進み具合

## 手順（1ステージ＝100語）
1. `scripts/authoring/<mode>-NN.tsv` を書く（列：語／読み or 品詞／意味／紛らわしい語／同義語。語どうしの参照は「語」で書く）
2. `scripts/authoring/manifest.tsv` に1行追加（mode, stage, ファイル名, 熟語の種類, レベル）
3. `python3 scripts/authoring/rebuild.py`（全ステージを先頭から作り直す。同義語は自動で双方向になる）
4. `npm run check-data` がエラー0件
5. `OVERLAP=0.5 npx tsx scripts/authoring/overlap.ts <mode> NN` で意味が似すぎた組を確認し、同義語にするか意味を書き分ける
6. コミットして main に push（GitHub Actions が自動で公開）

## 配分（仕様書 3章）
- 熟語 15ステージ：二字熟語 1〜9（L1:1-3, L2:4-6, L3:7-9）、和語・言い回し 10-11、四字熟語 12-13、ことわざ 14-15
- 英単語 30ステージ：L1 1-10、L2 11-22、L3 23-30

## 進み具合
進んだステージは `scripts/authoring/manifest.tsv` を見ればわかる。
