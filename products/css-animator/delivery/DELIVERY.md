# DELIVERY.md — css-animator S1（器）

## 体制情報
- Mode: M2 / LC=0 / Cycle: 1（HANDOFF §7 ビルド第1ステップ「S1の器」）
- 自律修正回数: 0 / 上限 3
- AI能力バージョン: Claude Opus 4 世代（2026-06）

## スコープ（厳守）
本サイクルは **S1の器のみ**。DSL→WAAPI変換 / seekキャプチャ / 非AI検証ゲート（G1〜G7）は
HANDOFF §7 のステップ2以降のため **未実装**（意図的）。`spec/domain.ts` は import 可能な状態で据え置き。

## 実装済み（S1範囲）
- **F1 意図注入層（器）**: 画像アップロードUI（PNG/JPG/WebP・1ファイル=1レイヤー）。意図テキスト欄は
  UIとして設置（S2でDSL翻訳に接続するため現段階は `disabled`・未接続と明示）。
- **F2 DSL生成層**: スキーマ（`spec/domain.ts`）を型として import できる状態（`src/state/layer.ts`）。
  生成・編集はS2のため未実装。
- **F3 実描画層（器）**: アップロード画像を `bg_canvas` 上にブラウザ描画する最小プレビュー。
  画像の natural 寸法を事実として右パネルに表示（美的評価語は出さない＝F4規律の先取り）。

主要ファイル: `index.html` / `src/main.tsx` / `src/App.tsx` / `src/components/{ImageUploader,PreviewCanvas}.tsx`
/ `src/lib/upload.ts`（純関数・検証ロジック）/ `src/state/layer.ts` / `src/styles/{tokens,app}.css`

## 自己検証結果（5層検出スタック）
| 層 | 対象 | 結果 |
|---|---|---|
| Shift Left 基盤 | 型（tsc --noEmit）・本番ビルド（vite build） | PASS（exit 0） |
| 第1層 計算的センサー | 単体/結合テスト（vitest）7件（upload検証6・App描画1） | PASS（7/7） |
| 第2層 E2E 機械検証 | Playwright スクショ | **延期**（理由: 視認系は PerceptionAdapter＝ハイブリッド環境の実装事項。S3描画と同時に整備するのが妥当） |
| 第3層 Interaction Cost | クリック数等 | N/A（器のみ・対話フロー未実装） |
| 第4層 推論的センサー | 「仕様に合う・動く・使える」 | PASS（S1範囲: 仕様合致・ビルド動作・アップロード→描画が使える） |
| 第5層 独立検証 | layer1-independent-reviewer | 本献上直後に起動（M2必須） |

## DESIGN.md 検証
- 第1層（静的・トークン整合）: **PASS**。`src/` 内に HEX リテラル・px 直書きなし（全て `tokens.css` の `var(--…)` 参照）。
  実装に伴い type-scale（`size_sm/base/md`）と `layout.panel_width` を DESIGN.md YAML と tokens.css に追加（2層同期）。
- 第2層（E2Eスクショ）/ 第5層（Vision判定）: **延期**。理由は上表第2層と同じ（視認はハイブリッド環境のアダプタ整備とセットで行う）。
  本サイクルでは chrome のトークン規律（静的）までを担保し、「使える」の視覚検証は S3 描画フェーズで E2E+Vision 経路に乗せる。

## 仕様改訂提案（Type C）
- **src のランタイム表現とDSL表現の差**: ブラウザ即時表示は `blob:` URL を使うため `SRC_PATTERN`（`uploads/…`）に合致しない。
  S2/保存時に「workspace/<id>/uploads/ へ保存 → src を `uploads/<fileName>` に確定」する写像が必要。
  現状は `src/state/layer.ts` のコメントに将来の写像を明記して仮置き（仕様変更は不要、実装メモとして報告）。

## 異常献上（Type D）
なし。

## 体制事後評価
- M2 は妥当。S1は規模・リスクとも小さく自律修正0回で通過。L2発動閾値には未到達。
- 次サイクル（S2: DSL生成＋WAAPI変換＋seekキャプチャ）でも M2 継続を推奨。
- HANDOFF §7 の「ステップ4で必ず止まる」境界に向け、S2→S3を経て1往復成立時に C2 を L0 へ献上する。
