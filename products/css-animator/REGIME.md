# REGIME — css-animator

モード判定結果（spec-architect §4）。

## 判定サマリ

| 軸 | 値 | 根拠 |
|---|---|---|
| **モード** | **M2（標準モード）** | L0 → L1 + layer1-independent-reviewer |
| **dev_mode** | **github_assisted** | GitHub○・M2・LC≤1。autonomous不採用（下記） |
| **ARC** | **monolith** | 単一Viteアプリ・単一デプロイ単位 |
| **persona** | default | REGIME新規・`persona.active` 未指定 |
| **AI能力バージョン** | Claude Opus 4 世代（2026-06 時点） | L2発動閾値はこの能力に依存 |
| **LC** | 0（新規） | 振り返り儀式スキップ |

## S/U/R スコアリング

| 軸 | スコア | 根拠 |
|---|---|---|
| S（規模） | 1 | 単一Viteアプリ。core（DSL/変換器/ゲート）+ capture adapter + 最小UI。<80 files / <10k行 / domains=1 |
| U（不確実性） | 1 | coreは明確。capture-in-container（Playwright seek + read/write バッチ化）に小さな不確実性。C2はスコープ外で温存 |
| R（リスク） | 1 | ローカル/個人ツール、外部公開なし、私的データ消失リスク低（uploadsはローカル） |

- 合計 S+U+R = 3。R≥2 不成立（M2強制はかからない）／U≥3 不成立（対話延長不要）。
- 一次判定は M1/M2 境界（3）。**M2を採用**する理由 → 次節。

## なぜ M2（独立検証あり）か

本プロジェクトの本質は「**AIは自己検証できない／SoTを外部化する／独立検証に置く**」。
この哲学は layer1-independent-reviewer（実装コンテキストから隔離した独立照合）と直結する。
自己検証のみのM1でも回るが、独立検証層を持つM2が本プロジェクトの精神に整合する。
※ ユーザーがミニマル志向なら M1 への降格は可（ADR記録の上）。

## なぜ autonomous でなく github_assisted か

受け入れ基準に「**美的良否＝人間専権**」が含まれる。
全自動merge（人間レビュー不要化）は、この基準と原理的に両立しない
（描画の美的良否は決定論ゲートで判定不能＝人間が承認する）。
よって自動merge前提の `autonomous` は採らず、`github_assisted`（L0 + 人間承認）を確定。
昇格・降格は手動 + ADR記録必須。

## L2発動閾値チェック

SPEC<15k tok / files<80 / 行<10k / domains=1 / 並行=1 / 1サイクル<2h。
**いずれも未超過 → L2不発動。**

## サブフェーズ

[spec/subphase-manifest.md](./spec/subphase-manifest.md) 参照。L0-2（ドメインモデル）のみ起動。
