import { describe, it, expect } from "vitest";
import { SRC_PATTERN } from "../../spec/domain";
import {
  buildDefaultDoc,
  sanitizeSrc,
  summarizeGates,
  CAPTURE_ATS,
} from "./capture-shared";
import { loadAnimationDoc, parseDslText } from "./dsl";
import type { GateResult } from "./gates";

describe("CAPTURE_ATS", () => {
  it("0/25/50/75/100% の5点（SPEC F3）", () => {
    expect([...CAPTURE_ATS]).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});

describe("sanitizeSrc", () => {
  it("通常ファイル名は uploads/<name> 形式（SRC_PATTERN 適合）", () => {
    const s = sanitizeSrc("cat.png");
    expect(s).toBe("uploads/cat.png");
    expect(SRC_PATTERN.test(s)).toBe(true);
  });

  it("空白・括弧・日本語を含む名でも SRC_PATTERN に適合させる", () => {
    for (const name of ["my photo (1).PNG", "ふわっと.webp", "a/b/c.jpg"]) {
      const s = sanitizeSrc(name);
      expect(SRC_PATTERN.test(s)).toBe(true);
      expect(s.includes("/")).toBe(true); // uploads/ の1つだけ
      expect(s.startsWith("uploads/")).toBe(true);
    }
  });

  it("未知拡張子は png にフォールバック", () => {
    expect(sanitizeSrc("x.gif")).toBe("uploads/x.png");
    expect(sanitizeSrc("noext")).toBe("uploads/noext.png");
  });
});

describe("buildDefaultDoc", () => {
  it("生成した既定DSLはスキーマを通過する（loadAnimationDoc が throw しない）", () => {
    const doc = buildDefaultDoc("layer_1", "uploads/cat.png");
    expect(() => loadAnimationDoc(doc)).not.toThrow();
    expect(doc.layers[0].keyframes.length).toBe(3);
    expect(doc.layers[0].keyframes[0].opacity).toBe(0); // ふわっと現れる
  });
});

describe("summarizeGates", () => {
  const g = (pass: boolean): GateResult => ({ gate: "x", pass, detail: "" });
  it("PASS/FAIL を数える", () => {
    expect(summarizeGates([g(true), g(true), g(false)])).toEqual({
      passed: 2,
      failed: 1,
      allPass: false,
    });
    expect(summarizeGates([g(true)])).toEqual({
      passed: 1,
      failed: 0,
      allPass: true,
    });
  });
});

describe("parseDslText", () => {
  it("有効な DSL テキストを doc + raw に解決", () => {
    const text = JSON.stringify(buildDefaultDoc("layer_1", "uploads/cat.png"));
    const r = parseDslText(text);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.doc.layers[0].target).toBe("layer_1");
      expect(r.raw).toBeTypeOf("object");
    }
  });

  it("JSON 構文エラーを事実として返す", () => {
    const r = parseDslText("{ not json");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/JSON 構文エラー/);
  });

  it("スキーマ違反（未知プロパティ）を事実として返す", () => {
    // width はレイアウトプロパティ＝.strict() で拒否（DONT §3.1）
    const bad = {
      layers: [
        {
          target: "l",
          src: "uploads/x.png",
          duration_ms: 1000,
          keyframes: [
            { at: 0, width: 10 },
            { at: 1, y: 5 },
          ],
        },
      ],
    };
    const r = parseDslText(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/スキーマ違反/);
  });
});
