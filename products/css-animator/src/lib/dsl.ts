// 中間体DSL（animation.json）のロードと検証。
// spec/domain.ts の Zod スキーマを正典とし、構造的に不正な DSL を parse 時点で弾く。

import { AnimationDocSchema, type AnimationDoc } from "../../spec/domain";

/** 検証して AnimationDoc を返す。不正なら ZodError を throw。 */
export function loadAnimationDoc(input: unknown): AnimationDoc {
  return AnimationDocSchema.parse(input);
}

/** throw しない版（UI でのエラー表示用） */
export function safeLoadAnimationDoc(input: unknown) {
  return AnimationDocSchema.safeParse(input);
}
