# workspace — 実データ配置規約

ワークベンチが連続/断続的に作る **実データ（runtime）** の置き場。ハーネス本体（SPEC/spec/sensors 等）とは分離する。

## モデル: project/library

アニメ1つ ＝ 1 project。連続/断続的に増える前提で、project 単位に並べる。

```
workspace/
├─ <project-id>/
│   ├─ uploads/        元画像（入力ラスタ。DSL の src が参照）       … .gitignore
│   ├─ animation.json  中間体DSL（生きた source・唯一の真実源）       … ★版管理
│   ├─ .captures/      非AI検証ゲート用の離散フレーム（揮発・毎回再生成）… .gitignore
│   └─ exports/        焼き込み成果（WebM/APNG/WebP 等・DSLから再生成可）… .gitignore
└─ _done/<project-id>/  export 済みで凍結した project の退避先
```

## ライフサイクル: 「DSL＝生きた source / export＝焼き込んだ葉」

1. **作業中**: `uploads/` に画像を置き、意図テキスト → CC が `animation.json` を差分編集。
2. **検証**: ブラウザ実描画を `currentTime` seek でキャプチャ → `.captures/` → 非AIゲート判定。
3. **確定**: 人間が美的良否を承認。
4. **排出（S5）**: `exports/` に一方向変換で焼き込み（再編集不可）。
5. **完了**: project を `_done/<project-id>/` へ退避し DSL を凍結。
   微調整は export を触らず、**DSL を複製して新 project** として再開する（履歴を壊さない）。

## 版管理（git）

- **追跡するのは `animation.json` のみ**（`_done/` 配下の凍結DSLも含む）。
- `uploads/` `exports/` `.captures/` は `.gitignore`（画像バイナリのリポ肥大回避・派生物/揮発物）。
- `uploads/` 等のディレクトリはアプリが起動時/必要時に生成する（clone 後は不在）。

## 未確定（C2）

`project-id` の命名規約、過去DSLを発案の種に再利用する「履歴の seed pool 化」の代謝プロトコルは
**意図的に未確定**（DONT.md §1）。実描画ループを1往復回してから L0 で詰める。
