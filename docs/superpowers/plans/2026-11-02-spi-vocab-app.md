# SPI言語対策アプリ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 熟語5択・英単語4択を、ステージ制と間隔反復で解くスマホ向けPWAの最初の版（全機能＋各モード1ステージ100語）を作り、GitHub Pagesで公開できる状態にする。

**Architecture:** 画面に依存しない学習ロジック（`src/logic/`）を純粋関数として作り、Vitestで網羅的にテストする。画面は React の useReducer＋Context で1つの保存データ（`SaveData`）を扱い、変更のたびに localStorage へ保存する。単語データは1ステージ1ファイルのJSONを `import.meta.glob` で同梱する。

**Tech Stack:** React 18, Vite 5, TypeScript, Vitest, @testing-library/react, jsdom, vite-plugin-pwa, tsx（データチェック用）, GitHub Actions + GitHub Pages

**Spec:** `docs/superpowers/specs/2026-11-02-spi-vocab-app-design.md`

## Global Constraints

- 熟語は5択（正解1＋誤答4）、英単語は4択（正解1＋誤答3）
- 1ステージ＝100語＝1ファイル（`src/data/jukugo/stage-NN.json`, `src/data/english/stage-NN.json`、NNは2桁）
- ID：熟語 `jk-0001` 形式、英単語 `en-0001` 形式、ファイルをまたいで連番
- 再出題間隔：box1=1日, box2=3日, box3=7日, box4=14日, box5=30日
- 日付の切り替わりは午前4時（端末の現地時刻）
- 復習は1回の「今日の学習」で最大100問。新しい語の数は 10・20・30 から選択、初期値20
- ステージクリア：全100語が出題済み、かつ `lastCorrect` が真の語が80%以上
- ステージ練習・苦手まとめ解きは1回20問
- 苦手リストから外れる条件：box が3以上
- 不正解の語は同じ学習の中で3問後に1回だけ再出題し、その結果は記録しない
- localStorage キー：`spi-vocab-progress-v1`。壊れたデータの退避先キー：`spi-vocab-progress-v1-corrupt`
- 選択肢ボタンの高さは48px以上、選択肢は画面下半分に配置
- 問題文・意味・選択肢はすべてオリジナル。市販の問題集・辞書の文章を写さない
- 外部の状態管理ライブラリは使わない
- 公開パス：`/spi-vocab/`（リポジトリ名 `spi-vocab`）

## Review Focus

1. **選択肢の連打**：回答後にもう一度選択肢をタップしても、2回目は無視され、記録も1回だけになる（Task 7でテスト）
2. **前日の途中セッション**：前日に途中で閉じた学習を翌日に開いたら、それは破棄され、ホームに戻る（Task 9でテスト）
3. **localStorage が使えない**：プライベートブラウズなどで読み書きが例外を投げても、アプリは落ちずにメモリ上で動き、保存できない旨を表示する（Task 8でテスト）
4. **データ更新で消えた語**：保存済みの途中セッションが存在しないIDを含んでいたら、その問題を飛ばして続ける（Task 9でテスト）
5. **連続学習日数の境目**：午前3時の学習は前日分として数え、1日以上空いたら1に戻る。表示上は、最後の学習日が昨日より前なら0と表示する（Task 9でテスト）

---

### Task 1: プロジェクトの土台と型、日付計算

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`（仮表示のみ）, `src/test-setup.ts`
- Create: `src/types.ts`
- Create: `src/logic/day.ts`, `src/logic/random.ts`
- Test: `src/logic/day.test.ts`, `src/logic/random.test.ts`

**Interfaces:**
- Produces（`src/types.ts`）:
```ts
export type Mode = 'jukugo' | 'english';
export type Level = 1 | 2 | 3;
export type JukugoType = '二字熟語' | '和語' | '四字熟語' | 'ことわざ';
export type Pos = '名詞' | '動詞' | '形容詞' | '副詞' | 'その他';
export type JukugoEntry = { id: string; type: JukugoType; word: string; reading: string; meaning: string; level: Level; confusers: string[]; synonyms: string[] };
export type EnglishEntry = { id: string; word: string; pos: Pos; meaning: string; level: Level; confusers: string[]; synonyms: string[] };
export type Entry = JukugoEntry | EnglishEntry;
export type LoadedEntry = Entry & { stage: number };
export type Dataset = { entries: LoadedEntry[]; byId: Map<string, LoadedEntry>; stageCount: number };
export type WordProgress = { box: number; due: string; correct: number; wrong: number; lastCorrect: boolean; weak: boolean };
export type ProgressMap = Record<string, WordProgress>;
export type Settings = { newPerDay: 10 | 20 | 30; iosGuideSeen: boolean };
export type QueueItem = { id: string; choices: string[]; requeue: boolean };
export type SessionKind = 'daily' | 'stage' | 'weak';
export type Session = { mode: Mode; kind: SessionKind; stage: number | null; day: string; queue: QueueItem[]; index: number; answeredChoice: string | null; results: { id: string; correct: boolean }[] };
export type Stats = { streak: number; lastStudyDay: string | null };
export type SaveData = { version: 1; settings: Settings; progress: Record<Mode, ProgressMap>; stats: Stats; session: Session | null };
```
- Produces（`src/logic/day.ts`）: `dayKey(date: Date): string`（午前4時区切りの `YYYY-MM-DD`）, `addDays(day: string, n: number): string`, `diffDays(a: string, b: string): number`（a−b の日数）
- Produces（`src/logic/random.ts`）: `type Rng = () => number`, `makeRng(seed: number): Rng`（mulberry32）, `shuffle<T>(items: readonly T[], rng: Rng): T[]`（新しい配列を返す）

- [ ] **Step 1:** `npm create vite@latest`相当のReact+TS構成を手で作る。依存：`react react-dom`、開発依存：`vite @vitejs/plugin-react typescript vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event vite-plugin-pwa tsx @types/react @types/react-dom @types/node`。`vite.config.ts` に `base: '/spi-vocab/'` と `test: { environment: 'jsdom', setupFiles: 'src/test-setup.ts' }`。scripts：`dev`, `build`（`tsc -b && vite build`）, `test`（`vitest run`）, `check-data`（`tsx scripts/check-data.ts`）
- [ ] **Step 2: 失敗するテストを書く**（`day.test.ts`）
```ts
test('4時より前は前日', () => { expect(dayKey(new Date(2026, 10, 3, 3, 59))).toBe('2026-11-02'); });
test('4時ちょうどは当日', () => { expect(dayKey(new Date(2026, 10, 3, 4, 0))).toBe('2026-11-03'); });
test('月またぎ', () => { expect(addDays('2026-11-30', 1)).toBe('2026-12-01'); });
test('年またぎ', () => { expect(addDays('2026-12-31', 14)).toBe('2027-01-14'); });
test('差分', () => { expect(diffDays('2026-11-05', '2026-11-02')).toBe(3); });
```
`random.test.ts`：同じseedで同じ並び、`shuffle` が元配列を変えず要素集合が同じ。
- [ ] **Step 3:** `npm test` で失敗を確認
- [ ] **Step 4:** `day.ts`・`random.ts` を実装。日付計算は文字列を `Date.UTC` で扱い、タイムゾーンのずれを避ける
- [ ] **Step 5:** `npm test` で成功、`npm run build` が通ることを確認
- [ ] **Step 6:** コミット `feat: プロジェクトの土台・型・日付計算`

### Task 2: 再出題の記録更新（SRS）

**Files:**
- Create: `src/logic/srs.ts`
- Test: `src/logic/srs.test.ts`

**Interfaces:**
- Consumes: `WordProgress`, `addDays`
- Produces: `INTERVALS: Record<1|2|3|4|5, number>`（`{1:1,2:3,3:7,4:14,5:30}`）, `applyAnswer(prev: WordProgress | undefined, correct: boolean, today: string): WordProgress`, `isDue(p: WordProgress | undefined, today: string): boolean`（未出題・box0 は false）, `isSeen(p: WordProgress | undefined): boolean`（box≥1）

- [ ] **Step 1: 失敗するテストを書く**
```ts
test('未出題で正解 → box1・1日後', () => {
  expect(applyAnswer(undefined, true, '2026-11-02')).toEqual({ box: 1, due: '2026-11-03', correct: 1, wrong: 0, lastCorrect: true, weak: false });
});
test('box2で正解 → box3・7日後', () => { expect(applyAnswer(p({ box: 2 }), true, '2026-11-02')).toMatchObject({ box: 3, due: '2026-11-09' }); });
test('box5で正解 → box5のまま・30日後', () => { expect(applyAnswer(p({ box: 5 }), true, '2026-11-02')).toMatchObject({ box: 5, due: '2026-12-02' }); });
test('不正解 → box1・翌日・苦手', () => { expect(applyAnswer(p({ box: 4 }), false, '2026-11-02')).toMatchObject({ box: 1, due: '2026-11-03', weak: true, lastCorrect: false }); });
test('苦手はbox3到達で外れる', () => {
  expect(applyAnswer(p({ box: 1, weak: true }), true, '2026-11-02')).toMatchObject({ box: 2, weak: true });
  expect(applyAnswer(p({ box: 2, weak: true }), true, '2026-11-02')).toMatchObject({ box: 3, weak: false });
});
test('isDue: 期日当日はtrue、未出題はfalse', () => { /* due === today → true, due > today → false, undefined → false */ });
```
（`p()` は既定値を埋めるテスト用ヘルパ）
- [ ] **Step 2:** 失敗を確認
- [ ] **Step 3:** 実装
- [ ] **Step 4:** 成功を確認
- [ ] **Step 5:** コミット `feat: 再出題の記録更新`

### Task 3: データ読み込みと自動チェック

**Files:**
- Create: `src/logic/validate.ts`, `src/data/index.ts`, `scripts/check-data.ts`
- Create: `src/data/jukugo/stage-01.json`, `src/data/english/stage-01.json`（この段階では各5語の仮データ。Task 12・13で100語に置き換える）
- Test: `src/logic/validate.test.ts`

**Interfaces:**
- Consumes: 型一式
- Produces（`validate.ts`）: `buildDataset(stages: Entry[][]): Dataset`（配列の添字+1を stage にする）, `validateDataset(mode: Mode, stages: Entry[][], opts?: { requireFull?: boolean }): string[]`（エラー文の配列。空なら合格）
- Produces（`src/data/index.ts`）: `DATASETS: Record<Mode, Dataset>`（`import.meta.glob('./jukugo/stage-*.json', { eager: true, import: 'default' })` をファイル名順に並べて `buildDataset`）
- Produces（`scripts/check-data.ts`）: `fs` で両モードのJSONを読み、`validateDataset(..., { requireFull: true })` を実行。エラーがあれば一覧を出して `process.exit(1)`、なければ語数を出して終了コード0

`validateDataset` が検出するもの（各1テスト以上）：
1. IDの重複／同じモード内の `word` の重複
2. 必須項目の欠け・空文字、`type`・`pos`・`level` が許可された値以外
3. ID形式違反（熟語 `jk-` / 英単語 `en-` ＋4桁）と、全体での連番の欠け
4. `confusers`・`synonyms` に存在しないID、自分自身のID
5. 同じ語が `confusers` と `synonyms` の両方にある
6. `synonyms` が片方向（AがBを持つのにBがAを持たない）
7. `requireFull` のとき、1ファイルが100語でない
8. 全語について Task 4 の `buildChoices` で必要数の選択肢を作れない（`buildChoices` が例外を投げたらエラー文にする）

- [ ] **Step 1:** 上の1〜7を検出する失敗テストを書く（各テストは最小の不正データを作り、`validateDataset` の戻り値に該当IDを含むエラーが1件あることを確認）。正しいデータでは `[]` になるテストも書く
- [ ] **Step 2:** 失敗を確認
- [ ] **Step 3:** `validate.ts`・`index.ts`・`check-data.ts` を実装。8番は Task 4 完了後に追加する（Task 4 の Step 5 で行う）
- [ ] **Step 4:** `npm test` 成功、`npm run check-data` が仮データで「100語でない」エラーを出して終了コード1になることを確認（requireFull のため。これは想定どおり）
- [ ] **Step 5:** コミット `feat: データ読み込みと自動チェック`

### Task 4: 誤答選択肢の作成

**Files:**
- Create: `src/logic/distractors.ts`
- Modify: `src/logic/validate.ts`（チェック8を追加）
- Test: `src/logic/distractors.test.ts`

**Interfaces:**
- Consumes: `Dataset`, `LoadedEntry`, `Rng`, `shuffle`
- Produces: `choiceCount(mode: Mode): number`（jukugo=5, english=4）, `buildChoices(mode: Mode, targetId: string, ds: Dataset, rng: Rng): string[]`（正解を含むIDの配列をシャッフル済みで返す。候補不足なら `Error('not enough candidates: <id>')` を投げる）

誤答の候補は次の順に、除外条件を満たさないものから必要数になるまで取る。各段の中はシャッフルしてから取る：
1. 対象の `confusers`
2. 熟語：同じ `type` かつ同じ `level` → 同じ `type`。英単語：同じ `pos` かつ同じ `level` → 同じ `pos`
3. 同じモードの全語

除外：対象自身、対象の `synonyms`、`meaning` が対象と完全一致する語、既に選んだ語。

- [ ] **Step 1: 失敗するテストを書く**
```ts
test('熟語は5択・英単語は4択で正解を1つ含む', ...);           // length と includes(target)
test('選択肢に重複がない', ...);                               // new Set(c).size === c.length
test('同義語は選ばれない', ...);                               // 1000種のseedで synonyms が一度も含まれない
test('confusers が優先される', ...);                           // confusers が4つあれば全部入る
test('英単語は同じ品詞を優先する', ...);                       // 同品詞が十分あれば他品詞が入らない
test('意味が同じ語は選ばれない', ...);
test('候補不足で例外', ...);                                   // 3語しかないデータで熟語 → toThrow
```
- [ ] **Step 2:** 失敗を確認
- [ ] **Step 3:** 実装
- [ ] **Step 4:** 成功を確認
- [ ] **Step 5:** `validateDataset` にチェック8を追加し（各語について seed 固定の `makeRng(1)` で `buildChoices` を呼ぶ）、候補不足を検出するテストを `validate.test.ts` に追加して成功を確認
- [ ] **Step 6:** コミット `feat: 誤答選択肢の作成`

### Task 5: ステージの開放とクリア判定

**Files:**
- Create: `src/logic/stages.ts`
- Test: `src/logic/stages.test.ts`

**Interfaces:**
- Consumes: `Dataset`, `ProgressMap`, `isSeen`
- Produces:
  - `type StageInfo = { stage: number; total: number; seen: number; correctNow: number; accuracy: number; cleared: boolean; unlocked: boolean }`（accuracy は `correctNow / total`、0〜1）
  - `stageInfos(ds: Dataset, progress: ProgressMap): StageInfo[]`（stage 1 は常に unlocked、stage n+1 は stage n が cleared のとき unlocked）
  - `isCleared(info: Pick<StageInfo,'total'|'seen'|'correctNow'>): boolean`（`seen === total && correctNow / total >= 0.8`）
  - `currentNewStage(infos: StageInfo[]): number | null`（unlocked かつ `seen < total` の最小ステージ番号。なければ null）
  - `clearedCount(infos: StageInfo[]): number`

- [ ] **Step 1: 失敗するテストを書く**
```ts
test('80語正解・全出題でクリア', () => { expect(isCleared({ total: 100, seen: 100, correctNow: 80 })).toBe(true); });
test('79語ではクリアしない', () => { expect(isCleared({ total: 100, seen: 100, correctNow: 79 })).toBe(false); });
test('未出題が残るとクリアしない', () => { expect(isCleared({ total: 100, seen: 99, correctNow: 99 })).toBe(false); });
test('初期状態はステージ1だけ開放', ...);
test('ステージ1クリアでステージ2開放', ...);
test('現在のステージが全出題済み・未クリアなら currentNewStage は null', ...);
```
- [ ] **Step 2:** 失敗を確認
- [ ] **Step 3:** 実装
- [ ] **Step 4:** 成功を確認
- [ ] **Step 5:** コミット `feat: ステージの開放とクリア判定`

### Task 6: 学習セッションの組み立て

**Files:**
- Create: `src/logic/session.ts`
- Test: `src/logic/session.test.ts`

**Interfaces:**
- Consumes: `Dataset`, `ProgressMap`, `Settings`, `isDue`, `isSeen`, `stageInfos`, `currentNewStage`, `buildChoices`, `shuffle`, `Rng`
- Produces:
  - `buildDailySession(mode: Mode, ds: Dataset, progress: ProgressMap, settings: Settings, today: string, rng: Rng): Session`
  - `buildStagePractice(mode: Mode, stage: number, ds: Dataset, progress: ProgressMap, today: string, rng: Rng): Session`
  - `buildWeakSession(mode: Mode, ds: Dataset, progress: ProgressMap, today: string, rng: Rng): Session`
  - `dailyCounts(mode: Mode, ds: Dataset, progress: ProgressMap, settings: Settings, today: string): { review: number; fresh: number }`（ホームのボタン表示用。`buildDailySession` と同じ選び方の件数）
  - `REVIEW_LIMIT = 100`, `PRACTICE_SIZE = 20`

選び方：
- daily：期日が今日以前の語を `due` の古い順に最大100（同じ日付は ds の並び順）＋ `currentNewStage` のステージの未出題語を ds の並び順に `settings.newPerDay` 件。合わせてシャッフル
- stage：そのステージの語を、未出題（ds順）→ `lastCorrect` が偽（ds順）→ それ以外（シャッフル）の順に並べて先頭20件。最後に全体をシャッフル
- weak：`weak` が真の語をシャッフルして先頭20件
- 各 QueueItem の `choices` は作成時に `buildChoices` で決める（再開時に同じ選択肢を出すため）。`requeue: false`, `index: 0`, `answeredChoice: null`, `results: []`, `day: today`

- [ ] **Step 1: 失敗するテストを書く**
```ts
test('復習は期日の古い順に最大100問', ...);              // 期日到来150語 → review 100、最も古い100語が入る
test('新しい語は現在のステージから設定数', ...);          // newPerDay 20 → stage1 の未出題先頭20語
test('現在ステージ全出題・未クリアなら新しい語0', ...);
test('ステージ練習は未出題→不正解→その他の優先で20問', ...);
test('苦手まとめは weak の語のみ最大20問', ...);
test('全QueueItemの choices に正解が含まれる', ...);
test('dailyCounts は buildDailySession の件数と一致', ...);
```
- [ ] **Step 2:** 失敗を確認
- [ ] **Step 3:** 実装
- [ ] **Step 4:** 成功を確認
- [ ] **Step 5:** コミット `feat: 学習セッションの組み立て`

### Task 7: 回答処理（セッションの進行）

**Files:**
- Create: `src/logic/runner.ts`
- Test: `src/logic/runner.test.ts`

**Interfaces:**
- Consumes: `Session`, `QueueItem`
- Produces:
  - `currentItem(s: Session): QueueItem | null`（`index >= queue.length` なら null）
  - `answer(s: Session, choiceId: string): { session: Session; recorded: { id: string; correct: boolean } | null }`
  - `next(s: Session): Session`（`index + 1`、`answeredChoice: null`）
  - `isFinished(s: Session): boolean`
  - `REQUEUE_GAP = 3`

`answer` の規則：
- `answeredChoice` が null でなければ何もせず `{ session: s, recorded: null }`（連打対策）
- `answeredChoice` を設定。正誤は `choiceId === item.id`
- `item.requeue` が真なら記録しない（`recorded: null`、`results` に追加しない）
- 偽なら `results` に追加し `recorded` を返す。不正解なら `{ id, choices: item.choices, requeue: true }` を位置 `index + 1 + REQUEUE_GAP` に挿入（キューの長さを超えるなら末尾）

- [ ] **Step 1: 失敗するテストを書く**
```ts
test('正解で記録される', ...);
test('不正解は3問後に再出題として挿入される', ...);   // queue[index+4].id === 間違えた語 && requeue === true
test('末尾付近の不正解は最後に追加', ...);
test('再出題の回答は記録されない', ...);
test('回答済みの問題への2回目の回答は無視される', () => {
  const a = answer(s, wrongId).session;
  const b = answer(a, correctId);
  expect(b.recorded).toBeNull();
  expect(b.session.results).toHaveLength(1);
  expect(b.session.queue).toHaveLength(a.queue.length);
});
test('next で次の問題へ、最後で isFinished', ...);
```
- [ ] **Step 2:** 失敗を確認
- [ ] **Step 3:** 実装
- [ ] **Step 4:** 成功を確認
- [ ] **Step 5:** コミット `feat: 回答処理`

### Task 8: 保存・読み込み・バックアップ

**Files:**
- Create: `src/logic/storage.ts`
- Test: `src/logic/storage.test.ts`

**Interfaces:**
- Consumes: `SaveData`
- Produces:
  - `STORAGE_KEY = 'spi-vocab-progress-v1'`, `CORRUPT_KEY = 'spi-vocab-progress-v1-corrupt'`
  - `defaultSave(): SaveData`（settings `{ newPerDay: 20, iosGuideSeen: false }`、progress は両モード空、stats `{ streak: 0, lastStudyDay: null }`、session null）
  - `type LoadWarning = 'corrupt' | 'unavailable' | null`
  - `loadSave(storage: Storage | null): { save: SaveData; warning: LoadWarning }`
  - `writeSave(storage: Storage | null, save: SaveData): boolean`（例外や storage null なら false）
  - `exportBackup(save: SaveData): string`（`JSON.stringify` 整形済み）
  - `parseBackup(text: string): { ok: true; save: SaveData } | { ok: false; reason: string }`
  - `isSaveData(x: unknown): x is SaveData`（構造の検査。version が 1 であること、各項目の型）

規則：
- storage が null、または `getItem` が例外 → `defaultSave()` と `'unavailable'`
- 値がない → `defaultSave()` と null
- JSON として読めない、または `isSaveData` が偽 → 元の文字列を `CORRUPT_KEY` へ書き（失敗しても続行）、`defaultSave()` と `'corrupt'`
- `parseBackup`：JSONでない → reason `'ファイルの形式が正しくありません'`、version が 1 より大きい → `'新しい版のアプリで作られたバックアップです'`、それ以外の構造不正 → `'バックアップの中身が壊れています'`。読み込んだ save の `session` は null にする

- [ ] **Step 1: 失敗するテストを書く**（jsdom の localStorage と、例外を投げる偽の Storage を使う）
```ts
test('保存して読み直すと同じ', ...);
test('壊れたJSONは退避して初期状態・corrupt', ...);  // CORRUPT_KEY に元文字列
test('getItem が例外なら unavailable で落ちない', ...);
test('setItem が例外なら writeSave は false', ...);
test('バックアップの往復で同じ内容（session は null）', ...);
test('新しい版のバックアップは拒否', ...);
test('JSONでないバックアップは拒否', ...);
```
- [ ] **Step 2:** 失敗を確認
- [ ] **Step 3:** 実装
- [ ] **Step 4:** 成功を確認
- [ ] **Step 5:** コミット `feat: 保存とバックアップ`

### Task 9: アプリ全体の状態管理

**Files:**
- Create: `src/state/reducer.ts`, `src/state/store.tsx`, `src/logic/streak.ts`
- Test: `src/state/reducer.test.ts`, `src/logic/streak.test.ts`

**Interfaces:**
- Consumes: Task 2〜8 の全関数, `DATASETS`
- Produces（`streak.ts`）: `recordStudy(stats: Stats, today: string): Stats`（同日なら変化なし、前日なら +1、それ以外は 1）, `displayStreak(stats: Stats, today: string): number`（lastStudyDay が今日か昨日なら streak、それ以外は 0）
- Produces（`reducer.ts`）:
```ts
export type Action =
  | { type: 'START'; session: Session }
  | { type: 'ANSWER'; choiceId: string; today: string }
  | { type: 'NEXT' }
  | { type: 'QUIT' }
  | { type: 'SET_NEW_PER_DAY'; value: 10 | 20 | 30 }
  | { type: 'DISMISS_IOS_GUIDE' }
  | { type: 'IMPORT'; save: SaveData }
  | { type: 'RESET_MODE'; mode: Mode };
export function reducer(state: SaveData, action: Action): SaveData;
export function sanitizeOnLoad(save: SaveData, datasets: Record<Mode, Dataset>, today: string): SaveData;
```
- Produces（`store.tsx`）: `<StoreProvider>`、`useStore(): { save: SaveData; dispatch: (a: Action) => void; warning: LoadWarning; saveFailed: boolean; today: string; datasets: Record<Mode, Dataset> }`。起動時に `loadSave(window.localStorage)`（アクセス自体が例外なら null を渡す）→ `sanitizeOnLoad`。`save` が変わるたびに `writeSave`、失敗したら `saveFailed: true`。起動時に `navigator.storage?.persist?.()` を呼ぶ（結果は使わない）

規則：
- ANSWER：`runner.answer` を適用し、`recorded` があれば `applyAnswer` で該当モードの progress を更新し、`recordStudy` で stats を更新
- QUIT：session を null。セッションが終わったら（結果画面を閉じたら）QUIT する
- RESET_MODE：そのモードの progress を空にし、session がそのモードなら null
- `sanitizeOnLoad`：session.day が today と違えば session を null。session の queue から、id または choices のいずれかが dataset に存在しない QueueItem を取り除き（現在位置より前の項目を消した分だけ index を詰める）、`answeredChoice` は null に戻す

- [ ] **Step 1: 失敗するテストを書く**
```ts
// streak
test('午前3時の学習は前日扱い', () => { expect(recordStudy({ streak: 3, lastStudyDay: '2026-11-01' }, dayKey(new Date(2026, 10, 3, 3, 0)))).toEqual({ streak: 4, lastStudyDay: '2026-11-02' }); });
test('1日空くと1に戻る', ...);
test('同日2回目は変化なし', ...);
test('表示：最後の学習が一昨日なら0', ...);
// reducer
test('ANSWER で progress と stats が更新される', ...);
test('ANSWER の連打で progress の正解回数は1回分', ...);
test('前日のセッションは読み込み時に破棄', ...);
test('存在しないIDを含む問題は読み込み時に除かれ、index が詰まる', ...);
test('RESET_MODE は他モードの進捗を消さない', ...);
```
- [ ] **Step 2:** 失敗を確認
- [ ] **Step 3:** 実装
- [ ] **Step 4:** 成功を確認
- [ ] **Step 5:** コミット `feat: 状態管理`

### Task 10: 画面

**Files:**
- Create: `src/screens/Home.tsx`, `src/screens/StageList.tsx`, `src/screens/Quiz.tsx`, `src/screens/Result.tsx`, `src/screens/WeakList.tsx`, `src/screens/Settings.tsx`, `src/components/IosGuide.tsx`, `src/components/ProgressBar.tsx`, `src/components/ChoiceButton.tsx`, `src/styles.css`
- Modify: `src/App.tsx`
- Test: `src/screens/Quiz.test.tsx`, `src/screens/Home.test.tsx`, `src/screens/Settings.test.tsx`

**Interfaces:**
- Consumes: `useStore`, `Action`, `dailyCounts`, `buildDailySession`, `buildStagePractice`, `buildWeakSession`, `stageInfos`, `clearedCount`, `currentNewStage`, `displayStreak`, `exportBackup`, `parseBackup`, `currentItem`, `isFinished`
- Produces: 画面遷移は `App.tsx` 内の `useState<'home'|'stages'|'weak'|'settings'>` とタブ用 `useState<Mode>`。session が null でなく未終了なら常に Quiz、終了なら Result を表示（＝途中再開）

画面ごとの決め事（仕様書4章に加えて）：
- **Home**：タブ「熟語」「英単語」。「今日の学習（復習n問＋新しい語m問）」ボタン。n+m が0なら無効化し、`currentNewStage` が null で未クリアのステージがあれば「ステージ〇を練習してクリアしよう」と表示。進捗「ステージ クリア数/総数」、苦手n語、連続n日。下部に「ステージ一覧」「苦手リスト」「設定」。`warning === 'corrupt'` なら「保存データが壊れていたため、初期状態で起動しました」、`'unavailable'` または `saveFailed` なら「この環境では進捗を保存できません」を上部に表示
- **Quiz**：上部に `ProgressBar`（現在番号/キュー長）と「やめる」（QUIT）。熟語は問題文に `meaning`、選択肢に `word`。英単語は問題文に `word`＋`pos`、選択肢に `meaning`。回答後：正解の選択肢を緑、選んだ誤答を赤にし、各選択肢の下に、熟語なら「読み・意味」、英単語なら「英単語（品詞）」を表示。再出題の問題には「もう一度」ラベル。「次へ」ボタンで NEXT
- **Result**：正答数/問題数（再出題を除く `results` で数える）、正答率、間違えた語の一覧（熟語：語・読み・意味、英単語：語・品詞・意味）。「ホームへ」で QUIT
- **StageList**：各ステージの番号、熟語なら種類名、状態（未開放／学習中 正答率n%／クリア）。開放済みをタップで `buildStagePractice`
- **WeakList**：苦手な語の一覧と「まとめて解く（最大20問）」。0語なら「苦手な語はありません」
- **Settings**：新しい語の数（10/20/30）、「バックアップを書き出す」（`spi-vocab-backup-YYYY-MM-DD.json` をダウンロード）、「バックアップを読み込む」（ファイル選択 → `parseBackup` → 失敗なら reason を表示、成功なら確認ダイアログ（画面内のモーダル。`window.confirm` は使わない）→ IMPORT）、「熟語の進捗をリセット」「英単語の進捗をリセット」（同様に画面内モーダルで確認 → RESET_MODE）
- **IosGuide**：iOS（`/iPhone|iPad/` の UA）かつ `navigator.standalone` が真でなく、`iosGuideSeen` が偽のとき、「共有ボタン → ホーム画面に追加 してから、ホーム画面のアイコンで学習してください（Safariとは保存場所が別になります）」を表示。「わかった」で DISMISS_IOS_GUIDE
- スタイル：スマホ縦向き前提、最大幅480pxで中央寄せ、選択肢ボタンは高さ48px以上、選択肢エリアは画面下半分に固定

- [ ] **Step 1: 失敗するテストを書く**（テスト用の小さな Dataset を Provider に渡せるよう、`StoreProvider` に `datasets` と `storage` の props を任意で受けられるようにする）
```tsx
test('今日の学習ボタンに件数が出る', ...);                     // 新規データで「新しい語20問」
test('選択肢をタップすると正誤と全選択肢の意味が出る', ...);
test('回答後に別の選択肢をタップしても結果は変わらない', ...); // 連打
test('全問終えると結果画面になる', ...);
test('途中でやめて再読み込みすると続きから', ...);             // Provider を作り直し、同じ storage で同じ問題が出る
test('壊れたバックアップを読み込むと理由が出る', ...);
```
- [ ] **Step 2:** 失敗を確認
- [ ] **Step 3:** 実装
- [ ] **Step 4:** 成功を確認。`npm run dev` を Playwright で幅390pxの画面として開き、ホーム→今日の学習→回答→結果のスクリーンショットを撮って崩れがないことを目で確かめる
- [ ] **Step 5:** コミット `feat: 画面`

### Task 11: PWA化と自動公開

**Files:**
- Modify: `vite.config.ts`
- Create: `public/icon.svg`, `public/pwa-192.png`, `public/pwa-512.png`, `public/apple-touch-icon.png`, `scripts/make-icons.mjs`
- Create: `.github/workflows/deploy.yml`
- Create: `README.md`

**Interfaces:**
- Consumes: ビルド成果物
- Produces: `dist/` に `manifest.webmanifest` と Service Worker

- [ ] **Step 1:** `vite-plugin-pwa` を `registerType: 'autoUpdate'`、`workbox.globPatterns: ['**/*.{js,css,html,svg,png,json}']`、manifest `{ name: 'SPI言語対策', short_name: 'SPI言語', start_url: '/spi-vocab/', scope: '/spi-vocab/', display: 'standalone', theme_color, background_color, icons: 192/512 }` で設定。`index.html` に `apple-touch-icon` と `apple-mobile-web-app-capable` を追加
- [ ] **Step 2:** `icon.svg`（文字「語」のシンプルなアイコン）を作り、`scripts/make-icons.mjs` で Playwright を使って 192・512・180px の PNG を書き出す
- [ ] **Step 3:** `npm run build && npx vite preview --base /spi-vocab/` を起動し、Playwright で開いて Service Worker が登録されること、オフラインに切り替えて再読み込みしても表示されることを確認
- [ ] **Step 4:** `deploy.yml`：main への push で `npm ci → npm test → npm run check-data → npm run build → actions/upload-pages-artifact (dist) → actions/deploy-pages`
- [ ] **Step 5:** `README.md` に、使い方、GitHub の準備（リポジトリ `spi-vocab` を作成し、Settings → Pages → Source を GitHub Actions にする）、データの追加手順（6.3）を書く
- [ ] **Step 6:** コミット `feat: PWA化と自動公開`

### Task 12: 熟語データ ステージ1（100語）

**Files:**
- Modify: `src/data/jukugo/stage-01.json`（仮データを置き換え）

**Interfaces:**
- Consumes: `JukugoEntry` の形、`npm run check-data`

内容の決め事：
- すべて `type: "二字熟語"`、`level: 1`、ID `jk-0001`〜`jk-0100`
- SPIの熟語問題で基本とされる頻出の二字熟語を選ぶ
- `meaning` は自分の言葉で書いた、問題文として成り立つ説明（その熟語を言い当てられ、ほかの選択肢と区別できる）
- `confusers` は1語につき2〜4個。字が似ている、または意味が近いが説明には当てはまらない語を、このステージ内から選ぶ
- 説明に当てはまってしまう語は `synonyms` に入れ、双方向に書く

- [ ] **Step 1:** 100語を書く
- [ ] **Step 2:** `npm run check-data` で熟語側のエラーが0件になるまで直す（英単語側は仮データのため100語エラーが残ってよい）
- [ ] **Step 3:** 全100語を見直す：意味の正確さ、読みの正しさ、各語の5択を `buildChoices` で数パターン出力して「正解以外が説明に当てはまらないか」を確かめる。当てはまる組は `synonyms` に移す
- [ ] **Step 4:** コミット `data: 熟語ステージ1`

### Task 13: 英単語データ ステージ1（100語）

**Files:**
- Modify: `src/data/english/stage-01.json`

**Interfaces:**
- Consumes: `EnglishEntry` の形、`npm run check-data`

内容の決め事：
- すべて `level: 1`（英検準2級〜2級）、ID `en-0001`〜`en-0100`
- 品詞は偏らせず、動詞・名詞・形容詞を中心にする（4択で同品詞の誤答を作れるよう、各品詞15語以上）
- `meaning` は代表的な訳を1〜2個、読点区切り
- `confusers` は1語につき2〜4個。綴りが似ている（例：adapt / adopt）、または意味が近いが訳が違う語
- 訳が重なる語は `synonyms` に入れ、双方向に書く

- [ ] **Step 1:** 100語を書く
- [ ] **Step 2:** `npm run check-data` がエラー0件・終了コード0になるまで直す
- [ ] **Step 3:** Task 12 の Step 3 と同じ要領で、4択を出力して見直す
- [ ] **Step 4:** `npm test && npm run build` が通ることを確認
- [ ] **Step 5:** コミット `data: 英単語ステージ1`

---

## 最初の版の後（この計画の対象外）

- 本人がスマホで試し、使い心地の修正を行う
- 熟語・英単語を300語ずつ追加する（1回ごとに Task 12・13 と同じ手順）
