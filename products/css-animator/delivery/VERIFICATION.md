# VERIFICATION.md — css-animator S1（独立検証）

## 判定: PASS（視覚E2E/Vision層は次サイクルの必須ゲートとして明示・下記）

実装コンテキストを引き継がず、SPEC/DONT/REGIME/DESIGN/sensors と成果物を独立照合。
計算的センサーは検証者が再実行し事実で判定した（tsc/vitest/build いずれも exit 0、7/7 PASS）。

## 検証前提（スコープ）
本サイクルは HANDOFF §7 ビルド第1ステップ「S1の器」のみ。DSL→WAAPI変換 / seekキャプチャ /
非AI検証ゲート（G1〜G7）は **ステップ2以降のため未実装が正しい**。DELIVERY.md のスコープ宣言と一致。

## 仕様合致（SPEC F1〜F3 のS1範囲）
- **F1 意図注入層（器）** (critical): PASS — 画像アップロードUI（PNG/JPG/WebP・単一）実装。意図テキスト欄は
  `disabled`＋「S2でDSL翻訳に接続」と明示され、未接続を偽装していない（誠実）。
- **F2 DSL生成層（疎通）** (critical): PASS — `spec/domain.ts` の `Layer` 型を `src/state/layer.ts` が
  型 import し疎通。生成・編集はS2のため未実装（スコープ通り）。
- **F3 実描画層（器）** (critical): PASS — アップロード画像を `bg_canvas` 上に描画。natural寸法を
  右パネルに事実表示。

## 動作・使用確認
- 計算的センサー再実行: typecheck exit 0 / vitest 7件 PASS / vite build exit 0（dist生成）。
- 主要操作: アップロード（検証→blob描画）/ 未選択時プレースホルダ表示 — テストで担保（App.test.tsx）。
- エラーハンドリング: 空選択・複数選択・未対応形式の3経路を upload.test.ts で網羅、PASS。

## DONT 抵触チェック（独立grep + コード精読）
- 複数レイヤー受理: **なし**（`arr.length > 1` で拒否、C2明記）。
- 生CSS/インラインstyle動的生成・innerHTML注入・WAAPI先食い: **なし**。
- 美的評価語のUI/コード出力: **なし**（右パネルは「事実」表示のみ＝F4規律先取り）。
- スコープ先食い（DSL生成/キャプチャ/ゲート）: **なし**。

## 構造的安全性の実装担保
- 単一レイヤー: `validateUpload` が複数を拒否（DSLスキーマの `layers.max(1)` とランタイムで二重防御）。
- 形式whitelist: `ACCEPTED_TYPES`（png/jpeg/webp）で限定。

## 視覚仕様整合性（DESIGN.md 検証）
- **第1層（静的・トークン規律）: PASS** — `src/` 内に HEX リテラル・px 直書きなし（全て `tokens.css` の
  `var(--…)` 参照）。DESIGN.md YAML と tokens.css の type-scale / panel_width が2層同期。
  DESIGN.md 本体に未解決の `{token}` 参照なし（dead reference なし）。
- **第2層（E2Eスクショ）/ 第5層（Vision判定）: 本サイクルでは未実施 → 次サイクルの必須ゲートとして提起**。
  - 理由（独立検証者の判断・ハンドウェーブではない）: 本プロジェクトでは「ブラウザ実描画のキャプチャ機構」
    = `PerceptionAdapter` 自体が **S3の一次成果物**（非AI検証ゲートG1〜G7 が消費する離散フレーム取得層）。
    視覚E2E/Vision はこの capture 機構の上に一度だけ構築し、G1〜G7 と DESIGN視覚検証で **共用**するのが
    アーキテクチャ上クリーン。S1の静的シェルに使い捨ての単発スクショ test を先付けするより、S2/S3 で
    PerceptionAdapter と同時に正式整備する方が情報純度が高い。
  - **次サイクル(S2/S3)のPASS条件に含める**: Playwright（pinned chromium）で器を起動しスクショ取得 →
    `delivery/screenshots/` 保存 → DESIGN.md `## Do's and Don'ts` を Vision で照合。

## 配置規則 / クレジット
- ルート直下: INDEX/SPEC/DONT/REGIME/DESIGN/README ＋ アプリ土台（package.json/index.html/vite.config.ts/tsconfig.json）。作業メモ（PLAN/TODO/MEMO）混入なし。DESIGN.md はUIプロジェクトのため許可。
- `node_modules/` `dist/` は `.gitignore` 済み（コミットに混入なしを確認）。
- README.md クレジット: マーカー付きで存在（v5.24.0 / 2026-06-09）。

## 提起（取り消し線は書かない・L1/L0へ）
- Type C（DELIVERY記載済み）: `src` のランタイム表現（`blob:`）とDSL表現（`uploads/…`＝`SRC_PATTERN`）の差は、
  S2/保存時に「workspace/<id>/uploads/ へ保存 → src 確定」の写像で解消する設計。検証者として妥当と確認。

## 結論
S1範囲の (仕様適合 ∩ 動作 ∩ ユーザビリティ) を全て満たす → **PASS**。
視覚E2E/Vision（第2/5層）は S2/S3 で PerceptionAdapter と同時整備を必須ゲートとして申し送る。
