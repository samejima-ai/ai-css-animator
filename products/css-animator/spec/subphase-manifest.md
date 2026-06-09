# subphase-manifest — css-animator

L0サブフェーズ選定ログ（spec-architect §3.5）。pre-official。

## 基本5問の判定

| # | 質問 | 回答 | 起動 |
|---|---|---|---|
| S1 | データ保存／DB を使うか？ | `animation.json` はローカルファイル。DB無し | L0-2 を**起動**（DSLスキーマがドメイン核） |
| S2 | 外部システム/API とつなぐか？ | No | L0-3 スキップ |
| S3 | 画面数・遷移は複雑か？ | upload→preview→編集ループのみ。単純 | L0-4 スキップ |
| S4 | 複数ユーザー・権限差は？ | No（個人ローカルツール） | L0-5 スキップ |
| S5 | 時間/承認で状態自動遷移？ | No | L0-6 スキップ |

## 起動サブフェーズ

- **L0-2 ドメインモデル** → `spec/domain.ts`（Zod + TypeScript）
  - 中間体DSL（animation.json）の構造的安全性を正典化。
  - 確度: 高（HANDOFF §3 スキーマ確定済み）。
  - 特記: `.strict()` によるプロパティ・ホワイトリスト、`blur ≤ 10px` cap、`layers` length ≤ 1（単一レイヤー）を
    スキーマレベルで強制 = DONT.md §3.1 の「構造的消去」の実体。

他サブフェーズ（L0-3/4/5/6）は全てスキップ。`spec/` には `domain.ts` と本マニフェストのみ配置。
