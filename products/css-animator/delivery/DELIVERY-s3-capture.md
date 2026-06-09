# DELIVERY — css-animator S3 capture（PerceptionAdapter ＋ UI 配線）

## 体制情報
- Mode: M2 / LC=0 / Cycle: 3（S3 capture）
- ブランチ: `claude/css-animator-s3-capture`
- 自律修正回数: 0 / 上限 3
- AI能力バージョン: Claude Opus 4.8（2026-06）

## スコープ（厳守）
S3 capture ＝「PerceptionAdapter（実描画キャプチャ）」＋「S2 環境非依存コア（convert/gates/dsl）の UI 配線」。
**意図→DSL差分→実描画(WAAPI)→決定論キャプチャ→非AI検証ゲート の 1往復を UI 上で成立**させる。
S5（排出層）は**未着手**（HANDOFF §7 ステップ4で停止）。C2 は**未確定のまま維持**（最小実装で仮置き、L0 へ献上）。

## 実装済み

### 視認アダプタ（環境依存・差し替え可能）
- **PerceptionAdapter** `capture/perception-adapter.ts`（desktop/local Playwright 実装）:
  各 `at` で `currentTime = duration*at; pause()` → レイアウト確定 → スクショ＋bbox。
  **write(seek) と read(bbox) を分離バッチ化**（DONT.md §3.3）。`deviceScaleFactor=1` で PNG px と CSS px を一致。
  返却は SPEC の `CapturedFrame` を実データ駆動に拡張: `png`（SoT 可視化）/ `rgba`（G4 の等長入力）/ `bbox`（G3）/ `opacity`（G6）。
- **harness ページ** `capture/harness.ts`: stage(=viewport) ＋ レイヤー wrapper に `contain: layout paint` 既定付与。
  動かすのは wrapper（transform/opacity/filter を WAAPI 適用）。`window.__capture.{seek,read,measure}` を公開。

### 環境非依存コアのオーケストレーション
- **run-capture** `capture/run-capture.ts`: `loadAnimationDoc`（検証）→ `toWaapi` → adapter → **G2/G3/G4/G5/G6 を実データで駆動**。
  出力は事実のみ（GateResult ＋ フレームメタ）。美的評価語なし（SPEC.md F4）。コア（convert/gates/dsl）は Playwright を一切知らない。

### dev エンドポイント（1往復を UI 上で閉じる）
- **vite-plugin-capture** `capture/vite-plugin-capture.ts`: dev 専用 `POST /api/capture`（`apply: "serve"`＝production 非搭載）。
  body から `{dsl, imageDataUrl, viewport}` を受け、`runCapture` を実行して JSON 返却。ZodError は「どのパスが何で落ちたか」へ整形。
- `vite.config.ts` に配線。`vitest` の対象から `capture/**` を除外（実ブラウザ起動はコア外）。

### UI 配線（src/）
- **DslEditor** `src/components/DslEditor.tsx`: 中間体DSL（animation.json）の編集面＝「AIが触る世界」。`font_mono`、検証エラーを事実表示。
- **PreviewCanvas** `src/components/PreviewCanvas.tsx`: 検証済み DSL を WAAPI で live 実描画（人間の連続視認）。
  reduced-motion トグルで静止確認（DONT.md §4）、再生ボタンで再実行。DSL 変更→即描画反映（HMR 的体感即時・SPEC UX Must）。
- **VerifyPanel** `src/components/VerifyPanel.tsx`: 「キャプチャして検証」ボタン＋ゲート結果（PASS/FAIL・at・実測値）＋5フレームサムネ。事実のみ。
- **capture-client** `src/lib/capture-client.ts`: `/api/capture` を叩く薄い fetch。実行は Node 側＝AIは自己検証の輪に入らない。
- **App** `src/App.tsx`: アップロード→既定DSL流し込み→編集→live 描画→検証 を統合。
- 付随: `ImageUploader`（capture 用 `dataUrl` を生成）/ `state/layer`（`dataUrl` 追加）。
- **共有純ロジック** `src/lib/capture-shared.ts`: `CAPTURE_ATS`(0/.25/.5/.75/1) / `CAPTURE_VIEWPORT` / `buildDefaultDoc`（ふわっと浮いて着地）/ `sanitizeSrc` / `summarizeGates`。
  `src/lib/dsl.ts` に `parseDslText`（JSON 構文／スキーマ違反を区別した事実エラー）。

## 1往復の成立（実証）
既定DSL「ふわっと浮いて着地」（opacity 0→1 / y 0→-80→0 / scale →1.05 / blur 2→0）に対し:
- **直接（capture:smoke）**: 5フレーム・**G2〜G6 全 PASS**・実効 duration=1200ms（差0ms）。
- **HTTP 経路（POST /api/capture）**: `200` / 5フレーム / 全ゲート PASS（UI と同一経路）。
- **Vision 判定（事実）**: 保存スクショ（`delivery/screenshots/s3-capture/at-*.png`）は DSL を忠実反映 ——
  at=0 透明 / at=0.5 上方かつ半透明 / at=1 着地・不透明・わずかに拡大。美的判定はしない（人間専権）。
- **エラー経路**: GET→405、不正JSON→400、空 `layers`→400（スキーマ事実エラー）。

## 自己検証結果（5層検出スタック）
| 層 | 対象 | 結果 |
|---|---|---|
| Shift Left 基盤 | 型（tsc --noEmit）・本番ビルド（vite build） | PASS（exit 0、capture/ は browser bundle 非混入） |
| 第1層 計算的センサー | vitest 47件（既存32＋capture-shared/parseDslText 15） | PASS（47/47） |
| 第2層 E2E 機械検証 | **実 Playwright キャプチャ（capture:smoke）** ＋ HTTP 200 経路 | PASS（S1/S2 から申し送りの視覚検証経路を本サイクルで実体化） |
| 第3層 Interaction Cost | アップロード→検証まで（ボタン2〜3） | N/A 計測（しきい値内目視） |
| 第4層 推論的センサー | 「仕様に合う・動く・使える」 | PASS（意図→DSL→実描画→検証が UI 上で成立） |
| 第5層 独立検証 | layer1-independent-reviewer | 本献上直後に起動（M2必須） |

## DESIGN.md 検証
- 第1層（静的・トークン整合）: **PASS**。`src/` に HEX 直書きなし。px は ①`1px` hairline border（S1 既存規約）②サムネ寸法を 8px グリッド token（`calc(var(--space-unit)*N)`）化で解消。
  状態色 `--color-pass`/`--color-fail` を **DESIGN.md YAML と tokens.css の2層同期**で追加（機能状態色＝事実、美的評価ではない・F4）。
- 第2/5層（E2Eスクショ＋Vision）: **本サイクルで実体化**（S1「PerceptionAdapter 整備と同時」の申し送りを履行）。
- 注記: `capture/harness.ts` は Node 生成のキャプチャ専用ページ（app chrome ではない）ため、DESIGN トークン規律の対象外（px/HEX を内包するのは意図的）。

## L0 申し送りの順守
- **easing は per-segment 暫定維持**（schema/convert 不変）。実描画スクショが揃ったため、C2 で「区間ごと vs 全体」を **pixels で判定**できる状態になった。
- C2（双方向プロトコル・変更の言語化・却下/承認UI・複数レイヤー合成）は未確定のまま。`layers` length≤1 はスキーマで継続強制。

## 仕様改訂提案（Type C）
1. **PerceptionAdapter interface の実装的精緻化**: 実ゲート駆動には `CapturedFrame` に `rgba`（G4 等長入力）と `opacity`（G6）が要り、`captureFrames` は `waapi+imageDataUrl+viewport` を引数に取る方が疎結合。SPEC F3 の interface 注記へ昇格を提案（L1 は SPEC を直接書き換えず申し送り）。
2. **G4 の pixel 入力規約**: フレーム間比較は **等長の raw RGBA**（固定 viewport）が前提。PNG バイト列は内容依存で長さが変動し `gateNotStatic` の解像度一致前提を満たさない。`sensors/computational.md` G4 に1行明記を提案。
3. **easing 契約（S2-core 由来）**: per-segment vs 全体イージングは C2 で継続。

## 異常献上（Type D）
なし。

## 体制事後評価
- M2 妥当。自律修正0回で通過。L2発動閾値（SPEC<15k/files<80/<10k行/domains=1）未到達。
- HANDOFF §7 ステップ4＝「1往復で**必ず止まる**」境界に**到達**。S5 へは進まず、C2 議論の起点として L0 へ献上する。
- 次サイクル: L0 で C2（easing 含む）を実描画データを根拠に詰める → その後 S5（排出層）。
