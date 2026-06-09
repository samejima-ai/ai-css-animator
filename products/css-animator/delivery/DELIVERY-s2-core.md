# DELIVERY — css-animator S2 環境非依存コア

## 体制情報
- Mode: M2 / LC=0 / Cycle: 2（S2 のうち「環境非依存コア」部分）
- ブランチ: `claude/css-animator-s2-core`（master の S1 マージ後から分岐）
- 自律修正回数: 0 / 上限 3

## スコープ（厳守）
S2 のうち **ブラウザ非依存・ヘッドレスでテスト可能な純ロジックのみ**。
ブラウザ実行（`element.animate`）と実描画キャプチャ（PerceptionAdapter）は **desktop で整備**するため本サイクル対象外。
HANDOFF §7 の「ステップ4で必ず止まる」境界は維持（1往復成立はキャプチャ整備後）。

## 実装済み
- **DSLローダ** `src/lib/dsl.ts`: `spec/domain.ts` の Zod スキーマで検証（`loadAnimationDoc` / `safeLoadAnimationDoc`）。
  default 適用・未知プロパティ拒否・blur上限・単一レイヤー・パストラバーサル拒否を実証。
- **DSL→WAAPI 決定論変換器** `src/lib/convert.ts`（コア）:
  - 差分 keyframe を **プリミティブ独立の線形補間**で解決し、全 at の和集合へ**リサンプル**して
    完全な WAAPI keyframe を生成（WAAPI 入力が一意＝決定論）。
  - transform は個別プロパティ（`translate`/`rotate`/`scale`）＋ `opacity` ＋（blur使用時のみ）`filter`。
    合成フェーズ完結（S-Tier）。不要な filter レイヤーを出さず VRAM 圧迫を回避（DONT.md §3）。
  - `sampleAt`（任意時刻の解決値）/ `resolveKeyframes` / `toWaapi` を公開。
- **非AI検証ゲート（純ロジック）** `src/lib/gates.ts`: G2 blur-cap / G3 offscreen / G4 not-static /
  G5 duration / G6 opacity。入力は「キャプチャ済みデータ（bbox / pixels / 実効duration / 実測opacity）」で
  取得手段非依存。出力は事実のみ（美的評価語なし・F4）。
- **ブラウザ実行グルー** `src/lib/play.ts`: `applyAnimation(el, layer)`（薄いラッパ）。
  WAAPI 実装が要るため jsdom では検証せず、ロジック本体は convert.ts でテスト。

## 自己検証結果（5層検出スタック）
| 層 | 対象 | 結果 |
|---|---|---|
| Shift Left 基盤 | 型（tsc --noEmit）・本番ビルド | PASS（exit 0） |
| 第1層 計算的センサー | vitest 32件（converter 10・gates 10・dsl 5・S1 既存 7） | PASS（32/32） |
| 第2層 E2E 機械検証 | — | N/A（ブラウザ実行はコア外。desktop で整備） |
| 第3層 Interaction Cost | — | N/A |
| 第4層 推論的センサー | 「仕様に合う・動く・使える」 | PASS（DSL→WAAPI が決定論で一意・HANDOFF例を再現） |
| 第5層 独立検証 | layer1-independent-reviewer | 本献上直後に起動（M2必須） |

## 既知の注記（誠実な申し送り）
- **未配線**: convert/gates/dsl は UI エントリ（main.tsx）から未参照のためビルド成果物に含まれない（tree-shake）。
  これは設計通り＝desktop で PerceptionAdapter とともに wire-in する。本サイクルは「検証済みの核」を提供する段階。
- **視覚E2E/Vision（第2/5層の視覚部）**: S1 から継続の申し送り。PerceptionAdapter 構築と同時に desktop で整備。

## 仕様改訂提案（Type C）
- **変換の決定論契約を SPEC へ昇格提案**: convert.ts 冒頭にある変換契約（差分の独立線形補間 / 和集合リサンプル /
  個別transformプロパティ / blur使用時のみfilter / per-segment easing）は実装詳細を超えた仕様級の決定。
  L0 で SPEC.md に追記（または C2 議論で確定）すべき。L1 は SPEC を直接書き換えず本提案として申し送る。
  - 特に **easing が per-segment（区間ごと）適用**である点は、将来「全体イージング」を望む場合に変更が要るため要確認。

## 異常献上（Type D）
なし。

## 体制事後評価
M2 妥当。純ロジック中心で自律修正0回。L2閾値未到達。次は desktop で PerceptionAdapter（実キャプチャ）を
実装し、S3検証ゲートを実データで駆動 → ステップ4（1往復）成立で C2 を L0 へ献上。
