# SPEC — css-animator

AI×人間 協働 CSSアニメーション・ワークベンチ（HANDOFF D2 / S1〜S3 ＋ 非AI検証ゲート）。

---

## WHY（なぜ作るか）

画像1枚に「ふわっと浮いて着地」のような質的意図でアニメを付ける作業は、
- 人間が数値・座標・イージングを直接書くのは苦痛（発案と実装の間に断絶がある）
- かといってAIに丸投げすると、AIは自分の出力が「本当にそう動くか」を自己検証できない（描画を持たない）

ので、**AIが中間体DSLだけを編集し、ブラウザ実描画を唯一の真実源（SoT）に置き、美的良否判定は人間が握る**という責務分離で、両者の弱点を構造的に回避する。

副次目的（L0用・実装には不要）: 視認の非対称（人間=連続/AI=離散）の橋渡し、生CSS vs 構造化DSLでのAI自己修正成功率、人間判定の非AI harnessへの移譲限界、を実証データとして取る。

---

## 責務分離（A確定・絶対に重ねない）

| 主体 | 握る | 握らない |
|------|------|---------|
| 人間 | 意図発案・美的良否判定 | 数値・座標・描画機構 |
| CC（AI） | 意図→DSL差分翻訳・変更の言語化 | 描画・美的自己判定 |
| ブラウザ | 描画・SoT保持・WAAPI実行 | 判断（純粋実行機構） |

---

## WHAT（機能）と条件

### F1. 意図注入層（S1）— priority: critical
- 画像アップロード（PNG / JPG / 透過PNG）。当面 **1ファイル＝1レイヤー**。
- 自然言語の意図テキスト欄（例「ふわっと浮いて着地」）。**意図を過度に構造化しない**（発案権の侵食を避ける）。
- CCの責務: 意図 → DSLパラメータへの翻訳（このテキストは構造化せず質的入力のまま受ける）。

### F2. DSL生成・編集層（S2）— priority: critical
- `animation.json`（中間体DSL）を `spec/domain.ts` のスキーマに従って生成・編集。
- **差分パッチ単位で編集する**（全体再生成しない）。差分が「何を変えたか」を自明にする。
- 生CSSは生成しない。プリミティブは `x / y / rotate / scale / opacity / blur (+ origin)` に限定。
- `at` は 0〜1 正規化（速度変更は `duration_ms` 一発で効く）。

### F3. 実描画層（S3-描画）— priority: critical
- ブラウザが DSL → WAAPI（`element.animate(keyframes, options)`）で実描画（Vite devサーバ上）。
- HMR: DSL変更 → 即描画反映。
- **決定論キャプチャ**: フレームは再生して撮るのではなく、各時刻 `t∈{0,.25,.5,.75,1}` で
  `anim.currentTime = duration_ms * t; anim.pause()` → レイアウト確定 → スクショ＋bbox取得。
  マシン速度・FPSに依存しない再現可能フレームを得る（検証の決定論前提）。

### F4. 非AI検証ゲート（S3-検証）— priority: critical
- キャプチャに対する決定論判定。正典は [sensors/computational.md](./sensors/computational.md)。
- **CCに「いい感じです」等の美的評価を出力させない。** CC出力は「何を・どの数値で変えたか」の事実のみ。

### F5. 排出層（S5）— priority: standard（1往復確認後に着手）
- 確定DSL → 用途別フォーマットへ **一方向変換**（GIF非推奨 / WebM(VP9 alpha) / APNG / WebP 優先）。
- **排出物は焼き込み＝再編集不可**。微調整はDSLに戻る。
- 排出物は埋め込み先の `prefers-reduced-motion: reduce` を尊重する静止/フェード代替を同梱する（DONT.md A11y節）。

### F6. 相互作用モデル（C2 確定・2026-06-09）— priority: critical
S3 で1往復を回した結果、双方向プロトコルの最適形が見えたため C2 の中核を確定する（DONT.md §1 から移行）。

- **対話レイヤ = Claude Code スキル**（`/css-animator`）。専用アプリUIに作り込まず、Claude Code のチャット（発案・判定）＋ファイル編集（AIが触る世界）＋プレビューペイン（人間が見る世界）＋HMR を土台にする。割り切り: ワークフローは Claude Code 結合（スタンドアロンアプリではない）。
- **ブラウザ = モニタ**。`workspace/<project>/animation.json` を読んで実描画するだけ。人間は数値を編集しない（責務分離）。ブラウザ内 DSL エディタは置かない。
- **画像アップロード = 文脈ハンドオフ**。画像はチャットでなくプレビューペインから投入し `workspace/<project>/uploads/` に置く。置き場所自体が「これをアニメする対象」という文脈を AI に渡す。
- **編集 = AI がファイルを差分パッチ**（F2 準拠）。スキル実行 or 人間の一言で AI が active workspace を読み `animation.json` を書き換える → HMR でモニタ更新。
- **変更の言語化（C2 確定）**: AI はチャットに ①事実の差分（`y: -80 → -120` 等）＋②**解釈の一言**（例「『ふわっと』を“頂点高め＋戻りゆっくり”と解釈」）を出す。**美的自己判定（いい/きれい）は出さない**（F4・判定は人間）。
- **却下の戻し方（C2 確定）**: 人間が却下したら AI は `animation.json` を git で一手戻す（焼き直しなし・レシピを戻すだけ）。
- **最低限の人間検証**: モニタに 再生/再実行・reduced-motion 確認・「撮って確認」(5フレーム＋ゲート事実) を残す（人間が AI を介さず自己チェックできる最小機能）。
- **スキル実行 = モニタ起動とセット**: `/css-animator` で dev サーバ起動→プレビューペイン表示→active workspace ロード まで一括。

残る C2（未確定のまま）: 複数レイヤー合成・レイヤー間タイミング依存、`project-id` 命名規約・履歴 seed pool 化。

---

## 中間体DSL スキーマ（S2の核）

正典は [spec/domain.ts](./spec/domain.ts)（Zod）。形:

```jsonc
{
  "layers": [
    {
      "target": "layer_id",
      "src": "uploads/xxx.png",
      "duration_ms": 1200,
      "easing": "ease-out",          // または cubic-bezier(...)
      "iteration": 1,                // または "infinite"
      "keyframes": [
        { "at": 0.0, "x": 0, "y": 0, "rotate": 0, "scale": 1, "opacity": 1, "blur": 0 },
        { "at": 0.5, "y": -120 },    // 差分のみ記述可
        { "at": 1.0, "y": 0, "scale": 1.1 }
      ]
    }
  ]
}
```

設計判断（確定済み・再検討不要）:
1. プリミティブは画像操作に限定（情報純度向上 ＋ 偶然 composite-only S-Tier 安全集合に一致。DONT.md参照）。
2. `at` は 0〜1 正規化。
3. WAAPI keyframes へ決定論変換（AIは描画を知らなくてよい）。
4. 業界位置づけ: Lottieの超軽量版。画像1枚を動かす用途に最適化した宣言的アニメ記述。

---

## システム構成（ハイブリッド・環境非依存コア / 視認アダプタ分離）

```
products/css-animator/
├─ 環境非依存コア（決定論・どこでも動く）
│   ├─ animation.json（中間体DSL・唯一の編集対象）
│   ├─ DSL → WAAPI keyframes 変換器（純関数）
│   └─ 非AI検証ゲート（純関数：入力はキャプチャ済みフレーム＋bbox）
└─ 視認アダプタ（環境依存・差し替え可能）= PerceptionAdapter
     ├─ web/コンテナ実装：コンテナ内 Playwright（seek撮影＋DOM bbox）
     └─ CCデスクトップ実装：ローカル Playwright（同一インターフェース）
   ※ 人間の連続視認 = devサーバのプレビューURL（web）/ localhost（desktop）＝アダプタ外
```

`PerceptionAdapter` インターフェース（契約・実装は環境別）:

```ts
interface CapturedFrame { at: number; png: Uint8Array; bbox: DOMRectReadOnly; }
interface PerceptionAdapter {
  captureFrames(targetId: string, ats: number[]): Promise<CapturedFrame[]>;
}
```
- adapterは read（bbox）と write（currentTime設定）を **分離バッチ化** する（レイアウトスラッシング防止。DONT.md参照）。

---

## ファイル配置とライフサイクル（F6・確定）

ワークベンチは連続/断続的に多数のアニメを作る。ファイルは4種類でライフサイクルが異なり、
**「DSL＝生きたsource／export＝焼き込んだ葉」** の原則で扱う（HANDOFF §5 のファイル配置版）。

### レイアウト（project/library モデル）

```
products/css-animator/
├─ （ハーネス本体: SPEC/DONT/spec/sensors/… = 版管理する）
└─ workspace/
    ├─ <project-id>/
    │   ├─ uploads/        元画像（入力・.gitignore）
    │   ├─ animation.json  DSL（生きたsource・★版管理する唯一の実データ）
    │   ├─ .captures/      検証フレーム（揮発・.gitignore）
    │   └─ exports/        焼き込み成果（派生・.gitignore）
    └─ _done/<project-id>/  export済みの退避先（DSL凍結）
```

- `uploads/` `exports/` `.captures/` はアプリが起動時/必要時に生成する（git追跡しないため clone 後は不在）。
- `project-id` は人間可読の識別子（命名規約の標準化は C2 で詰める）。

### 版管理方針（決定）

**`animation.json`（DSL）だけを git 追跡する。** `uploads / exports / .captures` は `.gitignore`。
理由: DSLが唯一の真実源かつ将来の seed pool 候補。画像バイナリはリポを肥大させ、export はDSLから再生成可能な派生物。

### 完了ファイルの扱い（決定）

export 済み project は `workspace/_done/<project-id>/` へ退避し **DSLを凍結扱い**にする。
微調整は export を触らず（焼き込み＝再編集不可）、**DSLを複製して新 project として再開**する（履歴を壊さない）。
※ 過去DSLを発案の種に再利用する「履歴の seed pool 化」の代謝プロトコルは **C2＝意図的未確定**（DONT.md §1）。
今は物理配置のみ確定し、作法は1往復後に L0 で詰める。

## UX制約

- Must閾値: DSL差分→描画反映は **HMRで体感即時**（p95 < 1s 目安）。決定論キャプチャ5フレームは **< 5s**。
- 禁止挙動: 排出物の直接編集、AIによる美的自己評価出力（DONT.md）。
- 参考類似サービス: Lottie（ただし超軽量・画像1枚特化版という位置づけ）。

## test oracle（C5・相B母集団の種）

- TQ1 壊れてたら出したくない瞬間: **意図テキスト→DSL差分→実描画→検証** の1往復が成立すること。
- TQ2 成功とは: 人間が「数値を書かずに」意図を画に変換できること。
- TQ3 暗黙前提: 描画されたものが真実（AIの主張は真実でない）／美的判定は人間が下す。

---

## 実装着手順（HANDOFF §7 準拠）

1. devサーバ（Vite）＋画像アップロード＋ブラウザ描画の器（S1）
2. DSLスキーマ＋WAAPI決定論変換＋seekキャプチャ（S2＋S3描画）
3. 非AI検証ゲート（S3検証）
4. **1往復（意図→DSL差分→描画→キャプチャ→検証）が回ったら必ず停止 → C2議論の起点としてL0へ報告**
5. 排出層（S5）

> ステップ4で **必ず止まる**。そこがC2議論の起点（DONT.md「C2＝意図的未確定」）。
