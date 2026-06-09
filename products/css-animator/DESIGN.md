---
# DESIGN tokens — css-animator workbench chrome（最小）
# 主役はプレビューキャンバス（＝編集対象のアニメ）。chrome は徹底して控えめにする。
colors:
  primary: "#1A73E8"      # CTA（書き出し等）。WCAG AA 適合
  bg_canvas: "#1E1E1E"    # プレビュー背景（画像の透過・動きを見やすい中性暗色）
  bg_chrome: "#F7F7F8"    # パネル/ツールバー
  text: "#1F2329"
  border: "#E3E5E8"
typography:
  font_ui: "system-ui, -apple-system, 'Segoe UI', sans-serif"
  font_mono: "ui-monospace, 'SF Mono', Menlo, monospace"  # DSL/数値表示
  size_sm: 12             # px・補助テキスト/ヒント
  size_base: 13           # px・本文
  size_md: 14             # px・操作要素
spacing:
  unit: 8                 # 8px グリッド
radius:
  base: 8
layout:
  panel_width: 264        # px・左右パネル幅
---

# DESIGN — css-animator

## Overview

- ブランド・トーン: **クリーン・無装飾・高密度の開発ツール**。chrome（ツールバー/パネル）は背景に退き、
  プレビューキャンバスとアニメだけが視覚的主役になる。
- 参考: Vite/Storybook 系の質素な開発ツールUI。装飾的アニメーションは chrome 自身には付けない。

## レイアウト原則

- 3領域: ①画像アップロード＋意図テキスト欄（左 or 上） / ②プレビューキャンバス（中央・最大面積） / ③DSL差分・検証結果（右 or 下、`font_mono`）。
- プレビューキャンバスは `bg_canvas` の中性暗色で、画像の透過・移動・blur が視認しやすいようにする。

## Do's

- 数値・DSL差分・検証ゲート結果は `font_mono` で**事実として**表示する。
- reduced-motion プレビュー確認トグルを用意する（DONT.md §4）。

## Don'ts

- chrome（ボタン/パネル/遷移）に装飾アニメを付けない（プレビューの動きと混線し、SoTの観察を妨げる）。
- AIの美的評価語をUIに表示しない（CC出力は事実のみ。SPEC.md F4）。

> 注: 本プロジェクトのUXの真の検証は静的トークン検査では完結しない。プレビュー実描画（Playwrightスクショ）＋
> 人間の美的判定が最終。DESIGN.md は chrome の一貫性のための必要条件にとどまる。
