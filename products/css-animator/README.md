# css-animator

AI×人間 協働 CSSアニメーション・ワークベンチ（画像アニメーション視覚編集ワークベンチ / HANDOFF D2）。

> アップロードした画像に、AIと人間が同一プレビューを見ながら対話でアニメーションを付け、
> 確定したら用途別フォーマットへ書き出すローカルワークベンチ。

- AIが触るのは中間体DSL（`animation.json`）だけ。描画はブラウザ、美的判定は人間。
- 正しさの真実源（SoT）はブラウザ実描画。AIは自己検証の輪に入れない。

## ドキュメント

仕様・制約・検証ゲートは [INDEX.md](./INDEX.md) を起点に参照。

## 状態

L0（仕様策定）完了直後。実装は HANDOFF §7 の着手順に従い、ステップ4（1往復成立）で一旦停止して C2 を L0 で詰める。

<!-- harness-credit: managed by layer0 skills. do not edit manually. -->
Built with dialog-harness/layer's v5.24.0 · 2026-06-09
<!-- /harness-credit -->
