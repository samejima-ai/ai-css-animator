# VERIFICATION — css-animator S3 capture（独立検証）

実装コンテキスト隔離で SPEC.md / DONT.md / REGIME.md / sensors/computational.md / DESIGN.md を再読込し、
成果物（capture/ ＋ src/ 配線 ＋ delivery/screenshots/）と突き合わせた。

## 判定: PASS

M2（LC=0）。仕様適合 ∩ 動作 ∩ ユーザビリティ の3軸すべて PASS。`refactor-intent-map.md` 不在のため意図合致軸は非起動（後方互換）。

---

## 仕様合致

| 項目 | 結果 | 根拠 |
|---|---|---|
| F3 実描画層（WAAPI 実描画・HMR） | PASS | `PreviewCanvas` が検証済み DSL を `applyAnimation`(toWaapi) で live 実描画。DSL 変更→即反映（依存配列で再実行） |
| F3 決定論キャプチャ（`currentTime=duration*t; pause()`） | PASS | `harness.ts` の `seek` が currentTime 設定＋2rAF 確定、再生して撮らない。`CAPTURE_ATS=[0,.25,.5,.75,1]` |
| F3 PerceptionAdapter interface 契約 | PASS | `captureFrames` が SPEC の `CapturedFrame{at,png,bbox}` を満たし、実ゲート駆動に `rgba`/`opacity` を拡張（Type C で申し送り済み・下記） |
| F3 write/read 分離バッチ化（DONT §3.3） | PASS | adapter は evaluate(seek)→evaluate(read 1回)→screenshot。read/write 混在の thrash ループなし。wrapper に `contain: layout paint` |
| F4 非AI検証ゲート（取得手段非依存） | PASS | `run-capture.ts` が G2/G3/G4/G5/G6 を「キャプチャ済みデータ」で駆動。コア(gates.ts)は Playwright 非依存のまま |
| F4 CC出力＝事実のみ | PASS | VerifyPanel/gates は PASS/FAIL・at・実測値のみ。美的評価語の grep（いい感じ/滑らか/nice 等）= 0件 |

---

## 動作・使用確認

- **実 Playwright キャプチャ（capture:smoke）**: 既定DSLで 5フレーム・G2〜G6 **全PASS**・実効 duration=1200ms（差0ms）。再現確認。
- **HTTP 経路（POST /api/capture）**: `200`／5フレーム／全ゲートPASS（UI と同一の `runCapture` 経路）。
- **エラーハンドリング**: GET→`405`、不正JSON→`400`、空 `layers`→`400`（スキーマ事実エラー）。いずれも事実メッセージ。
- **使用確認**: アップロード→既定DSL流し込み→DSL編集（即描画反映）→「キャプチャして検証」→ゲート結果＋サムネ表示、の一連がUI操作で成立。reduced-motion トグル・再生ボタンも配線済み。

---

## 決定論性（独立確認）

- **コア無改変（git diff HEAD）**: `src/lib/convert.ts` / `src/lib/gates.ts` / `spec/domain.ts` / `src/lib/play.ts` は **diff ゼロ**。
  → easing per-segment 暫定維持（L0申し送り）/ G4 contract / `layers≤1` / `.strict()` / プリミティブ限定 が**実体として**保たれている。
- **G4 等長前提**: adapter は固定 viewport の stage を screenshot→`PNG.sync.read` で raw RGBA 化。フレーム間で長さ一定＝`gateNotStatic` の解像度一致前提を満たす（PNG バイト列直渡しの罠を回避）。妥当。
- **duration 決定論**: `getComputedTiming().duration` を測定値に使用。sensors G5 の定義（実描画タイムライン）に合致。

---

## DONT 非侵犯

- 生CSS不生成・プリミティブ限定: convert 無改変で transform/opacity/filter のみ。**侵犯なし**。
- `layers≤1`: スキーマ無改変。`buildDefaultDoc` は単一レイヤー。**維持**。
- **C2 未着手**: 双方向プロトコル／変更の言語化フォーマット／却下・承認UI／複数レイヤー合成 のいずれも未実装。DSLエディタは人間の JSON 編集に閉じ、AIの変更言語化UIではない。**停止境界遵守**。
- **S5 未着手**: 排出層なし。HANDOFF §7 ステップ4で停止。**遵守**。
- A11y（§4）: ワークベンチの reduced-motion 確認トグルを実装。排出物の reduced-motion 代替は S5 スコープのため未着手（規定どおり）。

---

## 視覚仕様整合性（5.5.1）

- 第1層（静的）: `src/` に HEX 直書き **0件**。px は ①`1px` hairline border（S1 既存規約）②サムネ寸法を 8px グリッド token 化で解消。
  `--color-pass`/`--color-fail` は DESIGN.md YAML と tokens.css の**両方に同期**追加（未定義参照・未使用定義なし）。機能状態色＝事実表示で F4 と整合。
- 第2層（E2Eスクショ）: `delivery/screenshots/s3-capture/at-{0,.25,.5,.75,1}.png` **5枚存在**。S1/S2 からの「PerceptionAdapter 整備と同時」申し送りを本サイクルで履行。
- 第5層（Vision・事実判定）: スクショは DSL を忠実反映（at=0 透明／at=0.5 上方・半透明／at=1 着地・不透明・微拡大）。Do's/Don'ts 違反（美的評価語のUI表示等）なし。
- 注記の妥当性: `capture/harness.ts` の px/HEX は Node 生成のキャプチャ専用ページ（app chrome ではない）。DESIGN トークン規律の対象外という L1 注記は妥当。

---

## 配置規則 / クレジット / 履歴

- 配置規則違反: なし。新規 `capture/`（Node 側）は browser bundle へ非混入（vite build で確認）。delivery/ 配下に DELIVERY/VERIFICATION/screenshots。ルート直下に作業メモ（PLAN/TODO/MEMO）混入なし。
- REGIME.md の改変は L0 の persona 設定（sheep-navigator）であり L1 実装スコープ外。整合。
- LC=0 のため過去 INTENT 整合性チェック（5.8）は非起動。
- クレジット（5.6）: 本サイクルで README 改変なし。指摘なし。

---

## 提起（非FAIL・合議／L0 へ。reviewer は単独訂正しない）

1. **視認層の寸法乖離（要観察）**: live プレビュー（人間の連続視認）は画像を canvas の最大90%で表示、capture harness は幅200px固定（640×480 stage）。
   motion は同一 DSL（convert）由来で一致するが、**絶対的な枠内位置が両者で異なる**ため、人間が live で「枠内に収まる」と感じても G3 が判定する枠とは別座標になりうる。
   → 人間の美的判定と決定論ゲートの対応を高めるなら、両視認層の stage 寸法規約を共有することを提案（C2 で双方向プロトコルを詰める際に併せて検討）。本サイクルでは FAIL としない（両者とも同一 DSL の妥当な実描画であり、G3 は harness 座標で決定論的）。
2. **L1 の Type C を支持（L0 へ転送推奨）**:
   - PerceptionAdapter interface の精緻化（`CapturedFrame` への `rgba`/`opacity`、`captureFrames` の引数化）を SPEC F3 注記へ昇格。
   - G4 の pixel 入力が「等長 raw RGBA」前提である旨を `sensors/computational.md` G4 に1行明記。
   いずれも実装が仕様の含意を明確化したもので、SPEC 本体の書き換えは L0 判断に委ねる（L1/reviewer は提起のみ）。

---

## 結論

差戻し事項なし。**PASS**。S3 capture により「意図→DSL→実描画→決定論キャプチャ→非AI検証」の1往復が UI 上で成立し、HANDOFF §7 ステップ4の停止境界に到達した。
上記 提起1（視認層寸法乖離）・提起2（Type C 昇格）は C2 議論の L0 入力として転送されたい。
