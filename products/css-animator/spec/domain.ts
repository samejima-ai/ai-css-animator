// 中間体DSL（animation.json）のドメインモデル。
// このスキーマが「構造的安全性」の単一情報源（SoT）。
// DSL→WAAPI変換器・非AI検証ゲートはこのスキーマを正典とする。
//
// 設計の肝: .strict() により未知プロパティ（width/top/margin 等のレイアウト
// プロパティ）は parse 時点で拒否される。= レイアウト/ペイントアニメの
// アンチパターンを「検証で弾く」のではなく「表現不能にする」（DONT.md §3.1）。

import { z } from "zod";

/** プリミティブ上限（DONT.md §3.2 / sensors/computational.md と同期） */
export const BLUR_MAX_PX = 10; // 半径>10px は非線形コスト＋レイヤー肥大

/** cubic-bezier(a,b,c,d) のゆるい形式チェック（4数値） */
const cubicBezier = z
  .string()
  .regex(
    /^cubic-bezier\(\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*\)$/,
    "cubic-bezier(a,b,c,d) 形式であること",
  );

export const EasingSchema = z.union([
  z.enum(["linear", "ease", "ease-in", "ease-out", "ease-in-out"]),
  cubicBezier,
]);

/**
 * keyframe: 差分記述可。`at` のみ必須、各プリミティブは optional。
 * 許可プリミティブ = x / y / rotate / scale / opacity / blur のみ（画像操作限定）。
 */
export const KeyframeSchema = z
  .object({
    at: z.number().min(0).max(1), // 0〜1 正規化時刻（duration から独立）
    x: z.number().optional(), // translateX(px)
    y: z.number().optional(), // translateY(px)
    rotate: z.number().optional(), // deg
    scale: z.number().positive().optional(),
    opacity: z.number().min(0).max(1).optional(),
    blur: z.number().min(0).max(BLUR_MAX_PX).optional(), // px・上限cap
  })
  .strict(); // ← 未知プロパティ（width/top 等）を構造的に拒否

export const LayerSchema = z
  .object({
    target: z.string().min(1), // レイヤーID
    src: z.string().min(1), // uploads/xxx.png
    duration_ms: z.number().positive(),
    easing: EasingSchema.default("ease-out"),
    iteration: z.union([z.number().positive(), z.literal("infinite")]).default(1),
    origin: z.string().optional(), // transform-origin（回転軸）
    keyframes: z
      .array(KeyframeSchema)
      .min(2)
      .refine(
        (ks) => ks.some((k) => k.at === 0) && ks.some((k) => k.at === 1),
        { message: "keyframes は at:0 と at:1 を含むこと" },
      ),
  })
  .strict();

export const AnimationDocSchema = z
  .object({
    // 当面は単一レイヤー（複数合成は C2 ＝ DONT.md §1）。
    layers: z.array(LayerSchema).min(1).max(1),
  })
  .strict();

export type Keyframe = z.infer<typeof KeyframeSchema>;
export type Layer = z.infer<typeof LayerSchema>;
export type AnimationDoc = z.infer<typeof AnimationDocSchema>;

/** 許可プリミティブ名（検証ゲート・変換器が参照する単一定義） */
export const ALLOWED_PRIMITIVES = [
  "x",
  "y",
  "rotate",
  "scale",
  "opacity",
  "blur",
] as const;
export type Primitive = (typeof ALLOWED_PRIMITIVES)[number];
