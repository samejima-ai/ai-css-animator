# DELIVERY — css-animator C2（ブラウザ＝モニタ化 ＋ CC スキル）

## 体制情報
- Mode: M2 / LC=0 / Cycle: 4（C2 相互作用モデルの確定と実装）
- ブランチ: `claude/css-animator-s3-capture`
- 自律修正回数: 1 / 上限 3（vitest の `import.meta.hot.off` ガード追加のみ）
- AI能力バージョン: Claude Opus 4.8（2026-06）
- 体制: 自律駆動（goal: 「自律駆動実行 council≒人間合意」）。C2 の決定は本セッションの対話で**人間合意済み**（council 原則の人間合意に相当）として扱い実装。

## スコープ
S3 で1往復を回して見えた最適形を C2 として確定し実装する: **ブラウザ＝モニタ／対話＝Claude Code スキル**。
人間は数値を触らず、AI が `animation.json`（ファイル）を差分編集 → HMR でモニタ更新 → 人間は実描画を見て判定。

## L0 文書化（spec-architect として）
- **SPEC.md**: `F6. 相互作用モデル（C2 確定）` を追加（対話レイヤ=CCスキル／ブラウザ=モニタ／画像=文脈ハンドオフ／編集=AIがファイル差分／変更の言語化フォーマット／却下=git戻し／最低限の人間検証／skill=モニタ起動）。
- **DONT.md**: §1 を「確定済み（SPEC F6 へ移行）／未確定（複数レイヤー・命名・seed pool）」に再構成。§2 に「画像そのものの編集＝将来の兄弟スキル候補として park」を追加。
- **DESIGN.md**: レイアウト原則をモニタ化（chrome 最小・DSL エディタを置かない）。
- **REGIME.md**: `## 相互作用レイヤ（C2 確定）` を追加。

## 実装済み
### Node 側
- **workspace 読み書き** `capture/workspace.ts`: `readState`（active `workspace/current/animation.json` ＋ 対象画像 dataURL）/ `saveUpload`（uploads/ に保存＋既定DSL seed）。active project = `current`（命名規約は継続 C2）。
- **dev プラグイン拡張** `capture/vite-plugin-capture.ts`:
  - `GET /api/state` … モニタが描く SoT（DSL＋画像）。
  - `POST /api/upload` … プレビューペインからの画像投入＝文脈ハンドオフ。
  - **file watcher** … `workspace/current/` の変化（＝AIのファイル差分パッチ）を検知し `server.ws.send("css-animator:state")`。編集→即描画反映。
  - 既存 `POST /api/capture` は維持。
### ブラウザ側（モニタ化）
- **App** `src/App.tsx`: `/api/state` を読んで描画。`import.meta.hot` の `css-animator:state` を購読し AI のファイル編集で自動再取得。**in-app DSL エディタを撤去**。残すのは upload（文脈ハンドオフ）＋最低限の人間検証（再生／reduced-motion／「撮って確認」）。
- **ImageUploader** `src/components/ImageUploader.tsx`: 選択画像を `(fileName, dataUrl)` で親へ → `/api/upload` 保存。
- **monitor-client** `src/lib/monitor-client.ts`: `fetchState` / `uploadImage`。
- **capture-shared** に `MonitorState` 型追加。
- **削除（dead化）**: `src/components/DslEditor.tsx`、`src/state/layer.ts`（人間が数値を編集しない＝責務分離の純化）。
### スキル
- **`/.claude/skills/css-animator/SKILL.md`**: 対話レイヤの実体。起動（preview_start で "css-animator dev (Vite)" → モニタ表示 → active workspace 読込）／意図→`animation.json` 差分パッチ（schema 厳守）／**変更の言語化（①事実の差分＋②解釈の一言、美的自己判定は禁止＝F4）**／検証（/api/capture）／却下時 git 一手戻し／停止境界（S5・残C2・画像編集はしない）を規定。
### workspace
- `workspace/current/animation.json`（既定DSL・★版管理）＋ `workspace/current/.gitignore`（uploads/.captures/exports を無視）。

## 自己検証結果（5層検出スタック）
| 層 | 対象 | 結果 |
|---|---|---|
| Shift Left 基盤 | tsc --noEmit / vite build | PASS（exit 0、capture/ は browser bundle 非混入） |
| 第1層 計算的センサー | vitest 47件（App.test をモニタ版に更新） | PASS（47/47） |
| 第2層 E2E 機械検証 | capture:smoke（実 Playwright）＋ live endpoints（state→upload→state→capture） | PASS（全ゲートPASS・src 反映） |
| 第3層 Interaction Cost | アップロード→検証（ボタン2〜3） | N/A 計測（しきい内目視） |
| 第4層 推論的センサー | 「仕様に合う・動く・使える」 | PASS（モニタが workspace を読み描画／watcher で即更新／対話=skill） |
| 第5層 独立検証 | layer1-independent-reviewer | 本献上直後に起動（M2必須） |

### 視覚検証（preview pane）
- preview_logs(error)＝エラーなし。preview_screenshot＝モニタ描画を確認：`file=sample.png`／`natural=160×160px`（uploads へ画像を書いた直後に watcher→再取得で facts 即更新）／`dsl ✓ スキーマ適合`／DSL エディタ無し／upload＋「キャプチャして検証」維持／hint「編集はチャットで…AI が animation.json を書き換えると即反映」。

## DESIGN.md 検証
- 第1層（静的）: `src/` に HEX 直書きなし。px は `1px` hairline と 8px グリッド token のみ（新規 `.hint code` も token）。
- DSL エディタ撤去によりレイアウトはモニタ寄り（DESIGN レイアウト原則と整合）。

## L0 申し送りの順守
- easing per-segment 暫定維持（`convert.ts`/`gates.ts`/`domain.ts` 無改変）。
- 変更の言語化フォーマット（C2）を SKILL.md に確定実装（事実差分＋解釈一言、美的自己判定は禁止＝F4）。

## 仕様改訂提案（Type C）
1. **狭幅時のキャンバス縮小**: 3カラム（左パネル＋キャンバス＋右パネル）は、プレビューペインが極端に狭いとキャンバス（モニタの主役）が縮む。通常幅では問題ないが、モニタの主役性を守るなら狭幅レイアウト（折返し/優先幅）を将来検討（軽微・follow-up）。
2. **上書き通知の自動化**: 新規アップロード/編集の AI への通知は現状「人間の一言/再取得」。将来 hook で AI への自動 ping も可能（速さ優先で今は見送り）。
3. **active project 単一**: `workspace/current/` 固定。複数 project 切替・命名規約は継続 C2。

## 追補（UI: 全面モニタ＋フローティングカード・2026-06-09）
人間フィードバック「モニタが見づらい／画像をメインに、他要素は半透明カードで全面展開」を反映。
- キャンバスを**全面展開**（`position: absolute; inset:0`・z-index 1）＝画像が主役。
- chrome は**前面の半透明フローティングカード**（`--color-overlay` ＋ backdrop blur・z-index 2）：左＝アップロード/ヒント/操作、右＝事実/検証。タイトルは前面オーバーレイ。
- トークン `overlay` / `overlay_border` を DESIGN.md YAML と tokens.css に同期追加。DESIGN レイアウト原則を更新。
- これにより Type C「狭幅でキャンバスが縮む」は解消（キャンバスは常に全面、カードは重ねて浮かせる）。
- 検証: tsc0 / vitest47 / build成功 / preview 実描画確認（全面キャンバスに緑サンプルがアニメ、左右カード半透明、検証パネル 5フレーム全ゲートPASS）。

## 異常献上（Type D）
なし。

## 体制事後評価
- M2 妥当。自律修正1回（テスト環境の `hot.off` ガード）で通過。L2発動閾値未到達。
- C2 の中核（双方向プロトコル＝CCスキル、ブラウザ＝モニタ、変更言語化、却下git戻し）を確定・実装。残 C2（複数レイヤー・命名・seed pool）と S5、画像編集は park。
- 次サイクル候補: 実運用で `/css-animator` スキルを回し、必要なら狭幅レイアウト／複数project を詰める。
