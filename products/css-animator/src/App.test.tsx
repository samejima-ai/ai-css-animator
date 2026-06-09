import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App (S1 の器)", () => {
  it("ヘッダ・アップロードボタン・未選択プレースホルダを描画する", () => {
    render(<App />);
    expect(screen.getByText(/css-animator/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "画像をアップロード" }),
    ).toBeInTheDocument();
    expect(screen.getByText("画像未選択")).toBeInTheDocument();
    expect(screen.getByTestId("preview-canvas")).toBeInTheDocument();
  });
});
