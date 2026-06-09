# DONT — css-animator

スコープ外の明示と、**構造的に排除する**アンチパターン。

---

## 1. C2＝意図的未確定（今回スコープ外・1往復を回してから L0 で詰める）

以下は独自に決めない。実装が必要になったら最小実装で仮置きし、L0に献上（excretion）する。

- 双方向1サイクルの厳密プロトコル（差分の表現形式・却下時の巻き戻し・履歴のseed pool化）
- AI→人間の「変更の言語化」フォーマットの標準化
- 却下/承認のUI上の扱い
- **複数レイヤー合成・レイヤー間タイミング依存**（当面 `layers` は length ≤ 1 をスキーマで強制）

理由: 実描画ループを一度回してからでないと最適形が見えない。先に決めると過大設計になる。

---

## 2. AI能力上の Don't（spec-architect 決定済み制約）

- **美的UXデザインの自己判定**: 「いい感じ」の良否はAIが出力しない（人間専権）。
- 複雑な状態管理UI（C2側で段階的に）。
- パフォーマンス最適化の自己裁量（下記の構造的制約で先回りして封じる）。
- 未知の外部API統合。

---

## 3. 構造的に排除するアンチパターン（性能・整合・A11y）

> 重要な観察: 以下の第1カテゴリは「検証で弾く」のではなく、**DSLに語彙が無いことで表現不能＝構造的に消去**している。
> AIは生CSSを書けず、`spec/domain.ts` の `.strict()` スキーマが未知プロパティを拒否し、
> 変換器は `transform / opacity / filter:blur` しか出力しない。これがSoT外部化／中間体DSLの狙いが性能面でも当たる所以。

### 3.1 表現不能（構造的消去・チェック不要）

| アンチパターン | なぜ我々では起きないか |
|---|---|
| `width / height / top / left / margin / padding / font-size` 等レイアウトプロパティのアニメ化 | DSLに語彙が無い（`.strict()` が拒否）。毎フレームのレイアウト再計算を構造的に回避 |
| `background-color / box-shadow` 等ペイントプロパティのアニメ化 | 同上。再ラスタライズを構造的に回避 |
| グローバルCSS変数（`:root`）の毎フレーム更新＝**継承爆弾** | CSS変数を使わずWAAPI keyframesを直記述。ツリー全体のスタイル再計算を構造的に回避 |
| SVG属性（`d / cx / cy / r`）の直接アニメ | 対象は画像ラスタ＋`transform`のみ。SVG属性アニメは射程外 |
| `will-change` の一律静的付与によるVRAM枯渇 | WAAPIが合成を管理。`will-change`を手動静的付与しない（付ける場合のみ動的解放） |

### 3.2 検証ゲートで決定論判定する（[sensors/computational.md](./sensors/computational.md)）

| アンチパターン | ゲート |
|---|---|
| 過剰blur（半径 > 10px）：コストが半径に非線形・レイヤー肥大 | DSLスキーマで `blur ≤ 10px` をcap ＋ ゲートで半径チェック |
| 画面外飛び出し / 静止バグ / duration逸脱 / opacity意図せず0 | HANDOFF §4 の4チェック |

### 3.3 実装規律（コア/アダプタ実装時に守る）

| リスク | 規律 |
|---|---|
| **レイアウトスラッシング**（read/write混在の同期再計算連鎖）。我々の決定論キャプチャ（`currentTime`設定→`getBoundingClientRect()`読取）が該当しうる | PerceptionAdapter は write（seek）と read（bbox）を**分離バッチ化**する |
| レイアウト伝播 | レイヤーwrapperに `contain: layout paint` を既定付与 |

---

## 4. アクセシビリティ（A11y）の扱い — authoringツール特有の分離

`prefers-reduced-motion` を素朴に全適用すると、編集キャンバスが動かなくなりツールとして成立しない。ゆえに分離する:

- **ワークベンチのプレビュー**: 動いてよい（編集対象だから）。reduced-motionでの見え方を確認するトグルを持てると望ましい。
- **排出物（S5）**: 埋め込み先の `@media (prefers-reduced-motion: reduce)` を尊重する静止/フェード代替を**同梱必須**。

---

## 付録A. アンチパターン技術根拠（ナレッジベース・人間提供資料の結晶化）

ブラウザのレンダリングパイプライン「スタイル計算 → レイアウト → ペイント → 合成」では、上流ステージのトリガが下流すべてを再実行させる。`transform / opacity` は合成フェーズのみ（S-Tier）。`filter:blur` はGPU合成だが半径に応じコスト増。レイアウトスラッシングは同期レイアウト再計算の連鎖。継承爆弾はグローバル変数更新によるツリー全体のスタイル再計算。FLIP（First-Last-Invert-Play）は最終位置計算後に`transform`で動かしバッチ化する技法。

## 付録B. 追加調査用キーワード（ナレッジ拡充）

- `"Compositor-driven animations" performance optimization`
- `"will-change" VRAM memory footprint composite layers`
- `"CSS Containment Module" layout paint isolation specs`
- `"Layout thrashing" DevTools Performance rendering bottleneck`
- `"CSS Variable inheritance bomb" style recalculation`
- `SVG attribute animation repaint performance`
- `"FLIP animation technique" shared element transition`
- `"Deferred keyframe resolution" batching reads and writes`
- `prefers-reduced-motion vestibular disorders CSS media queries`
