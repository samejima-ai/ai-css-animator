---
name: css-animator
description: 画像1枚に対話でCSSアニメーションを付けるワークベンチ。ブラウザ＝モニタ／チャット＝対話面で、AIが中間体DSL（products/css-animator/workspace/<project>/animation.json）を差分編集し、人間はプレビューペインで実描画を見て美的良否を判定する。「アニメ付けて」「ふわっと浮かせて」「css-animator」「この画像animate」「動きを足して/直して」「キャプチャして検証」等で起動。画像はプレビューペインからアップロード（チャットに画像を貼らない）。SPEC: products/css-animator/SPEC.md F6。
---

# css-animator — AI×人間 協働アニメーション・ワークベンチ

ブラウザは**モニタ**（人間の連続視認＝SoT実描画）、チャットは**対話面**（発案・判定）。
AIは中間体DSL（`animation.json`）だけを触り、人間は実描画を見て「きれい/変」を決める。
正典: `products/css-animator/SPEC.md`（特にF6相互作用モデル）/ `DONT.md` / `spec/domain.ts`。

## 責務分離（絶対に重ねない・SPEC §責務分離）
- 人間 = 意図発案・**美的良否判定**。数値は触らない。
- AI（このスキル）= 意図→DSL差分翻訳・変更の言語化。**描画も美的自己判定もしない**。
- ブラウザ = 描画・SoT保持（WAAPI実行）。判断しない。

## 0. 起動（モニタを開く）
1. dev サーバ＋プレビューペインを起動する: `preview_start` で `.claude/launch.json` の **"css-animator dev (Vite)"**（port 5173）を起動。これでモニタが開く。
2. active workspace を読む: `products/css-animator/workspace/current/`（`animation.json` ＝編集対象、`uploads/` ＝対象画像）。
3. 画像が未投入なら、人間に**プレビューペインの「画像をアップロード」から入れてもらう**（チャットに画像を貼らせない＝文脈ハンドオフ。SPEC F6）。アップロードで `uploads/` に保存＋既定DSLが seed される。

## 1. 対話ループ（1往復 = 意図→DSL差分→実描画→検証→判定）
人間が「ふわっと浮かせて」「もっとゆっくり」「着地で弾ませて」等を言ったら:

1. **現在の `animation.json` を読む**（全体再生成しない）。
2. **差分パッチで編集**する（SPEC F2）。`spec/domain.ts` のスキーマを厳守:
   - プリミティブは `x / y / rotate / scale / opacity / blur (+ origin)` のみ。生CSS不可。
   - `at` は 0〜1。`blur ≤ 10`。`layers` は length ≤ 1（複数合成は未確定C2・やらない）。
   - `src` は `uploads/<file>` 形式（パストラバーサル不可）。
3. **変更の言語化（F6確定フォーマット）**をチャットに出す:
   - ①**事実の差分**: 例「`keyframes[1].y: -80 → -120` / `duration_ms: 1200 → 900`」。
   - ②**解釈の一言**: 例「『ふわっと』を“頂点を高め＋戻りをゆっくり”と解釈しました」。
   - **禁止**: 「いい感じ」「きれいになった」等の**美的自己判定は出さない**（F4・判定は人間）。
4. ファイル保存で **HMR がモニタを即更新**する（人間は実描画を見る）。

## 1.5 プリセット（発案の種・seed pool）
`products/css-animator/presets/<name>.json` に人間承認済みの再利用モーションがある。
- 意図がプリセット相当（例「歩いている」→ `presets/walk.json`）なら、その `motion`（`duration_ms`/`easing`/`iteration`/`keyframes`）を起点にし、**現レイヤーの `target`/`src` は保持**して適用 → そこから差分で微調整する（ゼロから作らない）。
- 人間が「これをベースにして」と承認した良い動きは、`presets/<name>.json`（`{name, description, motion}`）として追記してよい。
- ※ プリセットの代謝（淘汰・統合）や命名規約の標準化は継続 C2（DONT.md §1）。今は「人間承認したものを足す」だけ。

## 2. 検証（非AI決定論ゲート・F4）
人間が「検証して」、または変更後の自己点検として:
- `POST /api/capture`（dev稼働時）に `{ dsl: <animation.json>, imageDataUrl: <uploads画像のdataURL> }` を送る。
  または `npm --prefix products/css-animator run capture:smoke` 系の決定論キャプチャを回す。
- 返るのは **5フレーム（t∈{0,.25,.5,.75,1}）＋ゲート事実**（G2 blur上限 / G3 画面外 / G4 静止 / G5 duration / G6 透明）。
- 報告は**事実のみ**（`at`・実測値・PASS/FAIL）。評価語を足さない。
- 人間はモニタ／フレームを見て**美的良否を判定**する（AIは判定しない）。

## 3. 却下時（F6確定）
人間が「やっぱり無し」「戻して」と言ったら、`animation.json` を **git で一手戻す**
（`git -C products/css-animator checkout -- workspace/current/animation.json` 等。焼き直しはしない＝レシピを戻すだけ）。

## 4. 停止境界（やらないこと）
- **S5 排出（GIF/WebM/APNG 書き出し）には進まない**（SPEC 実装着手順／別フェーズ）。
- 未確定C2を独自に決めない: 複数レイヤー合成・レイヤー間タイミング、`project-id` 命名規約、履歴 seed pool 化。
- **画像そのものの編集（アイコン色替え・リサイズ等）はしない**（DONT §2・将来の兄弟スキル候補）。
- DSL以外（生CSS・レイアウト/ペイントプロパティ）を出さない（`spec/domain.ts` の `.strict()` が構造的に拒否）。

## 参照
- `products/css-animator/SPEC.md`（F1〜F6）/ `DONT.md`（§1 C2・§3 構造的消去）/ `DESIGN.md`
- `products/css-animator/spec/domain.ts`（DSLスキーマ＝唯一の真実源）
- `products/css-animator/sensors/computational.md`（ゲートG1〜G7）
- 起動設定: `.claude/launch.json`（"css-animator dev (Vite)" / "css-animator preview"）
