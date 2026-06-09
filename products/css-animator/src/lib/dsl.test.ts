import { describe, it, expect } from "vitest";
import { loadAnimationDoc, safeLoadAnimationDoc } from "./dsl";

const valid = {
  layers: [
    {
      target: "layer_1",
      src: "uploads/cat.png",
      duration_ms: 1200,
      keyframes: [
        { at: 0, x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, blur: 0 },
        { at: 1, y: -20 },
      ],
    },
  ],
};

describe("loadAnimationDoc", () => {
  it("正当な DSL を受理し default を適用", () => {
    const doc = loadAnimationDoc(valid);
    expect(doc.layers[0].easing).toBe("ease-out");
    expect(doc.layers[0].iteration).toBe(1);
  });

  it("未知プロパティ（width）を拒否（.strict）", () => {
    const bad = structuredClone(valid);
    (bad.layers[0].keyframes[0] as Record<string, number>).width = 100;
    expect(safeLoadAnimationDoc(bad).success).toBe(false);
  });

  it("blur > 10 を拒否", () => {
    const bad = structuredClone(valid);
    (bad.layers[0].keyframes[1] as Record<string, number>).blur = 11;
    expect(safeLoadAnimationDoc(bad).success).toBe(false);
  });

  it("複数レイヤーを拒否（単一レイヤー強制）", () => {
    const bad = structuredClone(valid);
    bad.layers.push(structuredClone(valid.layers[0]));
    expect(safeLoadAnimationDoc(bad).success).toBe(false);
  });

  it("uploads/ 外の src を拒否（パストラバーサル）", () => {
    const bad = structuredClone(valid);
    bad.layers[0].src = "../secret.png";
    expect(safeLoadAnimationDoc(bad).success).toBe(false);
  });
});
