import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

// モニタは /api/state を読む。テストでは空 state（画像なし）を返す。
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ project: "current", dsl: null, imageDataUrl: null }),
    })),
  );
});

describe("App（モニタ）", () => {
  it("ヘッダ・アップロードボタン・未選択プレースホルダ・キャンバスを描画する", () => {
    render(<App />);
    expect(screen.getByText(/css-animator/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "画像をアップロード" }),
    ).toBeInTheDocument();
    expect(screen.getByText("画像未選択")).toBeInTheDocument();
    expect(screen.getByTestId("preview-canvas")).toBeInTheDocument();
  });
});
