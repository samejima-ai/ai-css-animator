import { describe, it, expect } from "vitest";
import { validateUpload } from "./upload";

function f(name: string, type: string): File {
  return new File([new Uint8Array([0])], name, { type });
}

describe("validateUpload", () => {
  it("空選択を拒否する", () => {
    expect(validateUpload([]).ok).toBe(false);
  });

  it("複数ファイルを拒否する（1ファイル＝1レイヤー）", () => {
    const r = validateUpload([f("a.png", "image/png"), f("b.png", "image/png")]);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("1ファイル");
  });

  it("未対応形式を拒否する", () => {
    const r = validateUpload([f("a.gif", "image/gif")]);
    expect(r.ok).toBe(false);
  });

  it.each(["image/png", "image/jpeg", "image/webp"])(
    "%s を受理する",
    (type) => {
      const r = validateUpload([f("x", type)]);
      expect(r.ok).toBe(true);
      expect(r.file).toBeDefined();
    },
  );
});
