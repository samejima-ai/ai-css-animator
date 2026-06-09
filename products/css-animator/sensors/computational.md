# sensors/computational — 非AI検証ゲート（決定論判定の正典）

S3検証層。キャプチャ（決定論キャプチャで得た 0/25/50/75/100% フレーム＋bbox）に対し
**機械判定可能なものだけ**を判定する。**美的良否は一切判定しない**（人間専権・層が違う）。

入力: `CapturedFrame[]`（`{ at, png, bbox }`）＋ 元の `AnimationDoc`（`spec/domain.ts`）。
出力: 各ゲートの PASS / FAIL ＋ FAIL時の `at`・実測値・期待値（事実のみ。評価語を吐かない）。

---

## ゲート一覧

### G1. プロパティ・ホワイトリスト（構造保証・実行時チェック不要）
`spec/domain.ts` の `.strict()` スキーマで未知プロパティは parse 時点で拒否される。
→ レイアウト/ペイントプロパティのアニメは**表現不能**（DONT.md §3.1）。本ゲートは「スキーマ検証が通ったこと」で充足。

### G2. blur半径上限
全keyframeの `blur ≤ BLUR_MAX_PX(=10)`。スキーマでcap済みだが、変換器出力側でも再確認（多層防御）。
- FAIL条件: いずれかのフレームの実効blur半径 > 10px。

### G3. 画面外飛び出し（bbox ⊄ viewport）
各フレームの `bbox` が viewport 矩形内に収まるか。
- FAIL条件: いずれかの `at` で bbox が viewport 外（はみ出し）。意図的な flythrough は将来 SPEC で許可フラグ化（C2側）。

### G4. 静止バグ（フレーム間 pixel 差分ゼロ＝アニメ死亡）
隣接フレーム間（および 0% vs 100%）の pixel 差分が全てゼロでないこと。
- FAIL条件: 全フレームが pixel 同一（= 動いていない）。
- 注意: 決定論キャプチャは異なる `currentTime` を seek して撮るため、差分比較が安定する。

### G5. duration逸脱
DSLの `duration_ms` と、実描画タイムライン（`anim.effect.getTiming().duration`）が一致するか。
- FAIL条件: 実効 duration が DSL値と乖離（許容誤差を超える）。

### G6. opacity意図せず0（透明バグ）
DSLが明示的に `opacity:0` を意図していないフレームで、実描画 opacity が 0（完全透明）になっていないか。
- FAIL条件: DSL上 opacity>0 を期待する `at` で、実測が 0。

### G7. reduced-motion代替の存在（排出時のみ・S5）
排出物が `@media (prefers-reduced-motion: reduce)` の静止/フェード代替を同梱しているか。
- FAIL条件: 代替が無い排出物（DONT.md §4）。

---

## 実装規律（ゲートではないが決定論性を支える）

- **レイアウトスラッシング防止**: PerceptionAdapter は write（`currentTime` seek）と read（`getBoundingClientRect`）を
  フレームごとに混在させず、**全フレームを seek→pause→まとめて測定** のように分離バッチ化する（DONT.md §3.3）。
- **layout隔離**: レイヤーwrapperに `contain: layout paint` を既定付与。

---

## CC（AI）の出力規律

- ゲート結果の報告は「`at=0.5` で bbox.right=1042 > viewport.width=1024（G3 FAIL）」のような**事実のみ**。
- 「いい感じ」「滑らか」等の美的評価語を**出力しない**（SPEC.md F4）。
