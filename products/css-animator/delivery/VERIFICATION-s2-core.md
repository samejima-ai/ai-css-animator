# VERIFICATION — css-animator S2 環境非依存コア（独立検証）

## 判定: PASS

実装コンテキストを引き継がず、SPEC/DONT/sensors と成果物を独立照合。計算的センサーは検証者が
再実行し事実判定（tsc exit 0 / vitest 32-32 / build exit 0）。

## 検証前提（スコープ）
S2 のうち「環境非依存コア」のみ。ブラウザ実行（`element.animate`）・実描画キャプチャ（PerceptionAdapter）は
desktop 整備のため未実装が正しい（DELIVERY-s2-core.md と一致）。

## 検証観点ごとの結果

### (1) DSL→WAAPI 変換の決定論性 — PASS
- 差分 keyframe を各プリミティブ独立に線形補間し、全 `at` の和集合へリサンプルして完全 keyframe を生成する
  実装を確認（`convert.ts` `sampleAt`/`resolveKeyframes`/`toWaapi`）。
- **HANDOFF例の再現をテストで実証**: at:0.5 で `scale="1.05"`（1→1.1 の独立中間）/ `translate="0px -120px"`、
  at:1 で `scale="1.1"`。`convert.test.ts` 10件 PASS（再実行確認）。
- 同一入力に対し出力が一意（リサンプルで全 keyframe が transform/opacity を完全指定）。

### (2) 出力プロパティが合成フェーズ完結（DONT §3 準拠） — PASS
- `convert.ts` の出力構築に含まれる CSS プロパティは **offset / translate / rotate / scale / opacity / filter /
  transformOrigin のみ**。`width/height/top/left/margin/padding/background/box-shadow` の出力は grep で皆無。
- レイアウト/ペイントプロパティのアニメは表現不能（DSL語彙＋変換器の双方で構造的に排除）。

### (3) blur 使用時のみ filter 出力 — PASS
- `usesBlur = frames.some(f => f.blur > 0)` で判定し、真のときのみ各 keyframe に `filter` を付与。
  blur 全0 のケースで filter 非出力をテストで確認（不要な合成レイヤー＝VRAM 圧迫の回避・DONT §3）。

### (4) 非AIゲートの事実性（F4 準拠） — PASS
- `gates.ts` G2〜G6 の `detail` は数値・座標・比較結果のみ。美的評価語（いい感じ/滑らか/美しい等）は grep で皆無。
- 入力は「キャプチャ済みデータ（bbox / pixels / 実効duration / 実測opacity）」で取得手段非依存
  ＝SoT外部化と整合（取得層を PerceptionAdapter に委ねられる）。

### (5) DSLローダのスキーマ違反拒否 — PASS
- `dsl.test.ts` で 未知プロパティ（`.strict`）/ blur>10 / 複数レイヤー / パストラバーサル（`../`）の
  4 違反すべてが `safeParse.success === false` になることを確認（5件 PASS）。default 適用も確認。

## 動作・使用確認
- 純ロジックのため計算的センサーで動作担保。32/32 PASS を独立再実行で確認。
- `play.ts`（`element.animate` グルー）は WAAPI 実装依存のため jsdom 非検証＝設計通り（desktop で実動）。

## 配置規則 / クレジット
- 成果物は `src/lib/` と `delivery/` 配下のみ。ルート直下の作業メモ混入なし。
- DESIGN.md 視覚検証（第2/5層）は本サイクル対象外（コアにUI差分なし。PerceptionAdapter と同時に desktop で整備）。

## 提起（取り消し線は書かない・L0/L1へ）
- **Type C 妥当と判断**: 変換の決定論契約（差分の独立線形補間 / 和集合リサンプル / 個別transform /
  blur時のみfilter / **per-segment easing**）は実装詳細を超えた仕様級の決定。SPEC.md への昇格 or C2 議論での
  確定が妥当。特に **easing が区間ごと適用**である点は、「全体イージング（duration全体に1本のeasing）」を
  望む設計に変える場合に変換アルゴリズムの変更を要するため、1往復後の C2 議論で人間判断に委ねるべき論点。
  （reviewer は提起のみ。SPEC への反映は L0 の責務。）

## 結論
S2コア範囲の (仕様適合 ∩ 動作 ∩ ユーザビリティ) を全て満たす → **PASS**。
desktop での PerceptionAdapter 実装＋実データ駆動により、ステップ4（1往復成立）→ C2 献上へ進める状態。
