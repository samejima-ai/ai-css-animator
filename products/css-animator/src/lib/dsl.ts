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

export type ParseDslResult =
  | { ok: true; doc: AnimationDoc; raw: unknown }
  | { ok: false; error: string };

/**
 * DSL エディタのテキスト（JSON 文字列）→ 検証済み AnimationDoc。
 * JSON 構文エラーとスキーマ違反を区別し、事実としてのエラー文字列を返す（評価語なし）。
 * raw は検証前の JSON（capture リクエストへそのまま渡す＝サーバが再検証する）。
 */
export function parseDslText(text: string): ParseDslResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `JSON 構文エラー: ${(e as Error).message}` };
  }
  const parsed = AnimationDocSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join(" / ");
    return { ok: false, error: `スキーマ違反: ${detail}` };
  }
  return { ok: true, doc: parsed.data, raw };
}
