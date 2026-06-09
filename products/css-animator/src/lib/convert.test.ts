import { describe, it, expect } from "vitest";
import type { Layer } from "../../spec/domain";
import { toWaapi, sampleAt } from "./convert";

function layer(partial: Partial<Layer> & Pick<Layer, "keyframes">): Layer {
  return {
    target: "layer_1",
    src: "uploads/x.png",
    duration_ms: 1200,
    easing: "ease-out",
    iteration: 1,
    ...partial,
  };
}

describe("toWaapi — 差分keyframeの決定論解決（HANDOFF例）", () => {
  const { keyframes, options } = toWaapi(
    layer({
      keyframes: [
        { at: 0, x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, blur: 0 },
        { at: 0.5, y: -120 },
        { at: 1, y: 0, scale: 1.1 },
      ],
    }),
  );

  it("offset は全 at の和集合", () => {
    expect(keyframes.map((k) => k.offset)).toEqual([0, 0.5, 1]);
  });

  it("at:0.5 で scale は独立に線形補間（1→1.1 の中間=1.05）、y=-120", () => {
    const mid = keyframes.find((k) => k.offset === 0.5)!;
    expect(mid.scale).toBe("1.05");
    expect(mid.translate).toBe("0px -120px");
    expect(mid.rotate).toBe("0deg");
    expect(mid.opacity).toBe(1);
  });

  it("at:1 で y=0, scale=1.1", () => {
    const end = keyframes.find((k) => k.offset === 1)!;
    expect(end.translate).toBe("0px 0px");
    expect(end.scale).toBe("1.1");
  });

  it("blur 全0 なら filter を出力しない（不要な合成レイヤー回避）", () => {
    expect(keyframes.every((k) => k.filter === undefined)).toBe(true);
  });

  it("options は duration/easing/iterations/fill", () => {
    expect(options).toEqual({
      duration: 1200,
      easing: "ease-out",
      iterations: 1,
      fill: "both",
    });
  });
});

describe("toWaapi — blur と infinite", () => {
  it("blur>0 を含むと filter を出力", () => {
    const { keyframes } = toWaapi(
      layer({ keyframes: [{ at: 0, blur: 0 }, { at: 1, blur: 8 }] }),
    );
    expect(keyframes.find((k) => k.offset === 1)!.filter).toBe("blur(8px)");
    expect(keyframes.find((k) => k.offset === 0)!.filter).toBe("blur(0px)");
  });

  it("iteration infinite → Infinity", () => {
    const { options } = toWaapi(
      layer({ iteration: "infinite", keyframes: [{ at: 0, y: 0 }, { at: 1, y: 10 }] }),
    );
    expect(options.iterations).toBe(Infinity);
  });

  it("origin 指定で transformOrigin を出力", () => {
    const { keyframes } = toWaapi(
      layer({ origin: "center", keyframes: [{ at: 0, rotate: 0 }, { at: 1, rotate: 90 }] }),
    );
    expect(keyframes[0].transformOrigin).toBe("center");
  });
});

describe("sampleAt", () => {
  it("scale を任意時刻で独立補間（0.25→1.025）", () => {
    const l = layer({ keyframes: [{ at: 0, scale: 1 }, { at: 1, scale: 1.1 }] });
    expect(sampleAt(l, 0.25).scale).toBeCloseTo(1.025, 6);
  });

  it("未定義プリミティブは default 定数（opacity=1, scale=1）", () => {
    const l = layer({ keyframes: [{ at: 0, y: 0 }, { at: 1, y: -10 }] });
    expect(sampleAt(l, 0.5).opacity).toBe(1);
    expect(sampleAt(l, 0.5).scale).toBe(1);
  });

  it("同一 at の重複でも NaN を出さず後勝ちで決定論的に解決", () => {
    // 同じ y を at:0 に重複指定（後勝ち=-5）。0除算 NaN が出ないこと。
    const l = layer({
      keyframes: [
        { at: 0, y: 0 },
        { at: 0, y: -5 },
        { at: 1, y: 10 },
      ],
    });
    const s = sampleAt(l, 0);
    expect(Number.isNaN(s.y)).toBe(false);
    expect(s.y).toBe(-5);
    expect(Number.isNaN(sampleAt(l, 0.5).y)).toBe(false);
  });
});
