/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { capturePlugin } from "./capture/vite-plugin-capture";

// S3: Vite + React + TS。capturePlugin は dev 専用の POST /api/capture を提供し、
// UI から実描画キャプチャ→非AI検証ゲートの1往復を駆動する（production には載らない）。
export default defineConfig({
  plugins: [react(), capturePlugin()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    // capture/ は Node + Playwright（実ブラウザ起動）なので vitest 対象から除外。
    // 純ロジックは src/ 側でテストし、実キャプチャは capture/smoke.ts（E2E）で検証する。
    exclude: ["capture/**", "node_modules/**", "dist/**"],
  },
});
