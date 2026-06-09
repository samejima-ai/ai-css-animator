import { describe, it, expect } from "vitest";
import type { Layer } from "../../spec/domain";
import {
  gateBlurCap,
  gateOffscreen,
  gateNotStatic,
  gateDuration,
  gateOpacity,
} from "./gates";

function layer(partial: Partial<Layer> & Pick<Layer, "keyframes">): Layer {
  return {
    target: "l",
    src: "uploads/x.png",
    duration_ms: 1000,
    easing: "ease-out",
    iteration: 1,
    ...partial,
  };
}

describe("gateBlurCap (G2)", () => {
  it("blur ≤ 10 は PASS", () => {
    expect(
      gateBlurCap(layer({ keyframes: [{ at: 0, blur: 0 }, { at: 1, blur: 10 }] })).pass,
    ).toBe(true);
  });
  it("blur > 10 は FAIL", () => {
    const r = gateBlurCap(
      layer({ keyframes: [{ at: 0, blur: 0 }, { at: 1, blur: 12 }] }),
    );
    expect(r.pass).toBe(false);
    expect(r.detail).toContain("12px");
  });
  it("blur が非有限値(NaN)は入力異常として FAIL（fail-closed）", () => {
    const r = gateBlurCap(
      layer({ keyframes: [{ at: 0, blur: 0 }, { at: 1, blur: NaN }] }),
    );
    expect(r.pass).toBe(false);
    expect(r.detail).toContain("入力異常");
  });
});

describe("gateOffscreen (G3)", () => {
  const vp = { width: 1024, height: 768 };
  it("viewport 内は PASS", () => {
    expect(
      gateOffscreen([{ at: 0, bbox: { x: 10, y: 10, width: 100, height: 100 } }], vp)
        .pass,
    ).toBe(true);
  });
  it("右にはみ出すと FAIL", () => {
    const r = gateOffscreen(
      [{ at: 1, bbox: { x: 1000, y: 0, width: 100, height: 50 } }],
      vp,
    );
    expect(r.pass).toBe(false);
    expect(r.detail).toContain("at=1");
  });
  it("bbox に NaN が含まれると入力異常として FAIL（fail-closed）", () => {
    const r = gateOffscreen(
      [{ at: 0, bbox: { x: NaN, y: 0, width: 100, height: 100 } }],
      vp,
    );
    expect(r.pass).toBe(false);
    expect(r.detail).toContain("入力異常");
  });
  it("負の幅は入力異常として FAIL", () => {
    const r = gateOffscreen(
      [{ at: 0, bbox: { x: 0, y: 0, width: -10, height: 100 } }],
      vp,
    );
    expect(r.pass).toBe(false);
  });
});

describe("gateNotStatic (G4)", () => {
  it("全フレーム同一は FAIL（静止バグ）", () => {
    const r = gateNotStatic([
      { at: 0, pixels: new Uint8Array([1, 2, 3, 4]) },
      { at: 1, pixels: new Uint8Array([1, 2, 3, 4]) },
    ]);
    expect(r.pass).toBe(false);
  });
  it("差分ありは PASS", () => {
    const r = gateNotStatic([
      { at: 0, pixels: new Uint8Array([1, 2, 3, 4]) },
      { at: 1, pixels: new Uint8Array([9, 2, 3, 4]) },
    ]);
    expect(r.pass).toBe(true);
  });
  it("pixel 長不一致（解像度不一致）は入力異常として FAIL（fail-closed）", () => {
    const r = gateNotStatic([
      { at: 0, pixels: new Uint8Array([1, 2, 3, 4]) },
      { at: 1, pixels: new Uint8Array([1, 2, 3]) },
    ]);
    expect(r.pass).toBe(false);
    expect(r.detail).toContain("不一致");
  });
});

describe("gateDuration (G5)", () => {
  const l = layer({ duration_ms: 1200, keyframes: [{ at: 0, y: 0 }, { at: 1, y: 10 }] });
  it("許容内は PASS", () => expect(gateDuration(l, 1205).pass).toBe(true));
  it("逸脱は FAIL", () => expect(gateDuration(l, 1400).pass).toBe(false));
});

describe("gateOpacity (G6)", () => {
  const l = layer({ keyframes: [{ at: 0, opacity: 1 }, { at: 1, opacity: 1 }] });
  it("期待>0 で実測0 は FAIL（透明バグ）", () => {
    expect(gateOpacity(l, [{ at: 0.5, opacity: 0 }]).pass).toBe(false);
  });
  it("期待通り不透明は PASS", () => {
    expect(gateOpacity(l, [{ at: 0.5, opacity: 1 }]).pass).toBe(true);
  });
  it("実測 opacity が非有限値(NaN)は入力異常として FAIL（fail-closed）", () => {
    const r = gateOpacity(l, [{ at: 0.5, opacity: NaN }]);
    expect(r.pass).toBe(false);
    expect(r.detail).toContain("入力異常");
  });
});
