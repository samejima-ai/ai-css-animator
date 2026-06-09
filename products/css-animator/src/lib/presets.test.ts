import { describe, it, expect } from "vitest";
import walk from "../../presets/walk.json";
import { loadAnimationDoc } from "./dsl";

// プリセット（発案の種）はスキーマ適合かつ seamless loop であることを保証する。
describe("presets/walk", () => {
  it("motion を現レイヤーに適用するとスキーマを通過する", () => {
    const doc = {
      layers: [{ target: "layer_1", src: "uploads/x.png", ...walk.motion }],
    };
    expect(() => loadAnimationDoc(doc)).not.toThrow();
  });

  it("seamless loop: at0 と at1 の y/rotate が一致", () => {
    const kf = walk.motion.keyframes;
    const first = kf[0];
    const last = kf[kf.length - 1];
    expect(last.y).toBe(first.y);
    expect(last.rotate).toBe(first.rotate);
  });
});
