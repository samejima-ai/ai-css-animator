# DONT — css-animator

スコープ外の明示と、**構造的に排除する**アンチパターン。

---

## 1. C2＝意図的未確定（S3 で1往復を回し、2026-06-09 に中核を確定）

### 確定済み（SPEC.md「F6. 相互作用モデル」へ移行）
- 双方向1サイクルのプロトコル ＝ **Claude Code スキル**（`/css-animator`）。専用アプリUIに作り込まない。
- AI→人間「変更の言語化」 ＝ **事実の差分 ＋ 解釈の一言**（美的自己判定はしない・F4）。
- 却下時の巻き戻し ＝ **`animation.json` を git で一手戻す**（焼き直しなし）。
- 編集面 ＝ ブラウザ内 DSL エディタは置かず、**AI がファイルを差分パッチ／ブラウザはモニタ**。画像投入はプレビューペイン経由＝文脈ハンドオフ。

### 未確定（継続 C2・独自に決めない）
- **複数レイヤー合成・レイヤー間タイミング依存**（当面 `layers` は length ≤ 1 をスキーマで強制）。
- `project-id` 命名規約。
- 履歴の seed pool 化（過去DSLの発案再利用）の**代謝プロトコル**（淘汰・統合・命名標準化）。
  ※ 2026-06-09: 最小の第一歩として `presets/<name>.json`（人間承認済みモーションの種）を開始（`presets/walk.json`）。AIは独自に種を増やさず、人間が「ベースにして」と承認したものだけ追記する。淘汰・代謝は引き続き C2。

理由: 実描画ループを一度回してからでないと最適形が見えない。先に決めると過大設計になる。

---

## 2. AI能力上の Don't（spec-architect 決定済み制約）

- **美的UXデザインの自己判定**: 「いい感じ」の良否はAIが出力しない（人間専権）。
- 複雑な状態管理UI（C2側で段階的に）。
- パフォーマンス最適化の自己裁量（下記の構造的制約で先回りして封じる）。
- 未知の外部API統合。
- **画像そのものの編集（アイコンの色替え・リサイズ・切り抜き等）**: css-animator の役割（「1枚にアニメを付ける」）の外。SVG は AI 直接編集可・raster は処理スクリプトで可能だが、本ツールに混ぜると情報純度が落ちる。**将来の兄弟スキル候補**として park（css-animator 本体には入れない）。

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
| `src` の `../` パストラバーサル（想定外パス解決） | `spec/domain.ts` の `SRC_PATTERN` で `uploads/` 配下の画像拡張子に制約、`/` 不許可で構造的に排除 |

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
