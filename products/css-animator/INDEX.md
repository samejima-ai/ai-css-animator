# INDEX — css-animator

AI×人間 協働 CSSアニメーション・ワークベンチ（画像アニメーション視覚編集ワークベンチ / HANDOFF D2）。

> アップロードした画像に、AIと人間が同一プレビューを見ながら対話でアニメーションを付け、
> 確定したら用途別フォーマットへ書き出すローカルワークベンチ。

## このプロジェクトの位置づけ

- 本ディレクトリは **dialog-harness 本体（リポジトリ root）から隔離された製品サブツリー** です。
  DH本体の状態（`VERSION` / `dh-manifest.yml` / `history/REGIME-LOG.md` 等）とは混線させません。
- DH本体は本製品の **methodology（仕様策定・検証の作法）** として同居しています。

## ドキュメント目次

| ファイル | 役割 |
|---|---|
| [SPEC.md](./SPEC.md) | 機能仕様（WHY / WHAT / 条件 / 優先順位 / 制約） |
| [DONT.md](./DONT.md) | スコープ外定義 ＋ 構造的に排除するアンチパターン（性能・整合・A11y） |
| [REGIME.md](./REGIME.md) | モード判定（M2 / github_assisted / monolith）・AI能力バージョン |
| [DESIGN.md](./DESIGN.md) | 視覚仕様（最小・ワークベンチchromeは控えめ、主役はキャンバス） |
| [sensors/computational.md](./sensors/computational.md) | 非AI検証ゲート（決定論判定の正典） |
| [spec/domain.ts](./spec/domain.ts) | 中間体DSL（animation.json）の Zod ドメインモデル＝構造的安全性の単一情報源 |
| [spec/subphase-manifest.md](./spec/subphase-manifest.md) | L0サブフェーズ選定ログ（L0-2 のみ起動） |

## 設計の背骨（3行）

1. **ACI＝世界の二分**: AIが触る世界（DSLファイル）と人間が見る世界（ブラウザ実描画）を構造的に分離。
2. **SoT＝ブラウザ実描画**: 正しさの真実源はAIの主張でなく実描画ピクセル。AIは自己検証の輪に入れない。
3. **ハイブリッド環境**: 決定論コア（DSL→WAAPI変換・検証ゲート）は環境非依存、視認層（人間連続視認 / CC離散キャプチャ）はアダプタで差し替え可能。

## 意図的に未確定（C2・1往復を回してから L0 で詰める）

双方向1サイクルの厳密プロトコル / AI→人間の変更言語化フォーマット / 却下・承認のUI / 複数レイヤー合成。
詳細は DONT.md「C2＝意図的未確定」節。
