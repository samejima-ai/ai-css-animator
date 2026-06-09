# VERIFICATION — css-animator C2（モニタ化＋CCスキル・独立検証）

実装コンテキスト隔離で SPEC.md（F6）/ DONT.md / REGIME.md / DESIGN.md / spec/domain.ts / sensors/computational.md を
再読込し、成果物（capture/ ＋ src/ ＋ `.claude/skills/css-animator/SKILL.md` ＋ workspace/）と突き合わせた。

## 判定: PASS

M2（LC=0）。仕様適合 ∩ 動作 ∩ ユーザビリティ の3軸すべて PASS。`refactor-intent-map.md` 不在のため意図合致軸は非起動。

---

## 仕様合致（SPEC F6 相互作用モデル）

| 項目 | 結果 | 根拠 |
|---|---|---|
| ブラウザ＝モニタ（animation.json をファイルから読む） | PASS | `App` は `/api/state`（`capture/workspace.ts: readState`）から DSL＋画像を取得して描画。in-app DSL エディタ無し |
| 編集→即描画反映（HMR 相当） | PASS | dev プラグインの file watcher が `workspace/current/` 変化で `server.ws.send("css-animator:state")`、`App` が購読し再取得。視覚検証で `natural=160×160` が画像書込直後に facts へ反映 |
| 画像＝文脈ハンドオフ（ペイン投入→uploads/保存） | PASS | `POST /api/upload`→`saveUpload` が `workspace/current/uploads/` に保存＋既定DSL seed。live で `src=uploads/verify.png` 反映を確認 |
| 編集＝AIがファイル差分パッチ | PASS | 人間の数値編集 UI 経路は撤去（`DslEditor.tsx`/`state/layer.ts` 削除、App/components に textarea・parseDslText・DslEditor 残存なし）。編集は SKILL.md でファイル側に規定 |
| 変更の言語化（事実差分＋解釈一言／美的自己判定禁止） | PASS | `SKILL.md` に ①事実の差分 ②解釈の一言、および「美的自己判定は出さない（F4・判定は人間）」を明記 |
| 却下＝git 一手戻し | PASS | `SKILL.md` §3 に `animation.json` を git で戻す（焼き直しなし）を規定 |
| 最低限の人間検証 | PASS | モニタに 再生/もう一度・reduced-motion 確認・「キャプチャして検証」(5フレーム＋ゲート事実) を維持 |
| skill 実行＝モニタ起動とセット | PASS | `SKILL.md` §0 に preview_start で "css-animator dev (Vite)"→モニタ→active workspace 読込 |

## 責務分離の純化（独立確認）
- 人間が DSL（数値）を UI で編集する経路は**消滅**（SPEC 責務分離「人間は数値を握らない」と整合）。人間の制御は 意図（チャット）＋判定（実描画を見る）＋最低限の自己検証 に閉じる。**退行ではなく整合化**。

## 動作・使用確認（再確認）
- tsc exit0 / vitest **47 PASS**（App.test をモニタ版へ更新）/ vite build 成功（`capture/` は browser bundle 非混入）。
- capture:smoke（実 Playwright）全ゲート PASS。
- live endpoints: `GET /api/state`→`POST /api/upload`→`GET /api/state`（src 反映）→`POST /api/capture`（5フレーム・全ゲートPASS）。エラー経路（GET upload=405 等）は既存どおり。
- preview pane: ランタイムエラーなし。モニタ描画確認（file/natural/dsl✓ の facts、DSL エディタ無し、upload＋検証維持、hint がチャット駆動を案内）。

## DONT 非侵犯 / 決定論コア
- **core 無改変（git diff HEAD）**: `convert.ts` / `gates.ts` / `domain.ts` / `play.ts` は **diff ゼロ**。→ プリミティブ限定・生CSS不生成・`layers≤1`・`.strict()`・easing per-segment 暫定 が保全。
- **S5 未着手**: 排出コードなし。SKILL.md §4 で明示停止。
- **残 C2 を独自確定せず**: 複数レイヤー（`layers≤1` 維持）・`project-id` 命名（`current` 固定で先送り）・seed pool は未確定のまま DONT §1 に保持。
- **画像編集の park**: DONT §2 に「画像そのものの編集＝将来の兄弟スキル候補（css-animator 本体に入れない）」を記載。実装にも画像処理は混入なし。

## 視覚仕様整合性（5.5.1）
- 第1層（静的）: `src/` に HEX 直書きなし。2桁px 直書きはテスト文字列のみ（`"0px -120px"` / `"12px"`）でスタイルではない。新規 `.hint code` も token 参照。DESIGN レイアウト原則のモニタ化と整合。
- 第2/5層: S3 で実体化済みの撮影＋Vision 経路を継続使用（本サイクルは描画ソースをファイル化しただけで、撮影エンジンは無改変）。

## 配置規則 / クレジット / 履歴
- skill 配置: `.claude/skills/css-animator/SKILL.md`（frontmatter `name`/`description` あり、起動〜停止境界を規定）。セッション cwd（リポジトリ root）から `/css-animator` で発見可能。
- workspace: `workspace/current/animation.json`（★版管理）＋`.gitignore`（uploads/.captures/exports 無視）＝SPEC F6 / workspace/README.md と整合。
- delivery/ に DELIVERY/VERIFICATION。ルート直下に作業メモ混入なし。LC=0 のため履歴整合性チェック非起動。

## 提起（非FAIL・合議／L0 へ。reviewer は単独訂正しない）
1. **production ビルドは monitor として非機能**: `/api/state`/`/api/upload`/`/api/capture` は dev 専用（`apply: "serve"`）。`vite build`→`preview` の成果物は state エンドポイントを持たず空モニタになる。F6 の「Claude Code 結合」割り切りの帰結であり設計どおりだが、`.claude/launch.json` の "css-animator preview" は本モデルでは用途が限定的。将来 export(S5) 時に静的成果物の扱いを再考。
2. **狭幅レイアウト**: 3カラムはプレビューペインが極端に狭いとキャンバス（モニタの主役）が縮む。通常幅は問題なし。モニタ主役性を守るなら狭幅対応を将来検討（DELIVERY Type C1 を支持）。
3. **skill の実効性**: SKILL.md は protocol 文書であり、機械テストでなく運用で効果が定まる。変更言語化の F4 境界（解釈の言語化はOK／美的自己判定は禁止）は明文化済みで、運用時の逸脱は次サイクルの観察対象。

## 結論
差戻し事項なし。**PASS**。C2 の中核（双方向プロトコル＝CCスキル、ブラウザ＝モニタ、変更の言語化、却下=git戻し）が SPEC F6 として確定・実装され、責務分離が純化された。提起1〜3は L0/将来サイクルの入力として転送されたい。
