// PerceptionAdapter（視認アダプタ・desktop/local Playwright 実装）。
// SPEC.md F3「システム構成」の契約: 各 at で `currentTime = duration*at; pause()` →
// レイアウト確定 → スクショ＋bbox。write(seek) と read(bbox) を分離バッチ化（DONT.md §3.3）。
//
// 環境依存はこのファイルに閉じる（Node + Playwright）。決定論コア（convert/gates）は
// 一切 Playwright を知らない。アダプタは差し替え可能（web/コンテナ実装も同インターフェース）。

import { chromium, type Browser } from "playwright";
import { PNG } from "pngjs";
import { buildHarnessHtml } from "./harness";
import type { WaapiAnimation } from "../src/lib/convert";

export interface CaptureBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** SPEC.md の CapturedFrame を実データ駆動に拡張（rgba=G4の等長入力 / opacity=G6入力）。 */
export interface CapturedFrame {
  at: number;
  /** stage の実描画 PNG（人間サムネ＝SoT の可視化） */
  png: Uint8Array;
  /** stage の生 RGBA（固定寸法＝フレーム間で等長。G4 not-static の入力） */
  rgba: Uint8Array;
  /** stage 座標系のレイヤー矩形（G3 offscreen の入力） */
  bbox: CaptureBBox;
  /** 実測 computed opacity（G6 の入力） */
  opacity: number;
}

export interface CaptureInput {
  waapi: WaapiAnimation;
  imageDataUrl: string;
  viewport: { width: number; height: number };
  ats: readonly number[];
}

export interface CaptureOutput {
  frames: CapturedFrame[];
  measuredDurationMs: number;
}

export interface PerceptionAdapter {
  captureFrames(input: CaptureInput): Promise<CaptureOutput>;
  close(): Promise<void>;
}

interface LayerRead {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

export class PlaywrightPerceptionAdapter implements PerceptionAdapter {
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
    return this.browser;
  }

  async captureFrames(input: CaptureInput): Promise<CaptureOutput> {
    const { waapi, imageDataUrl, viewport, ats } = input;
    const browser = await this.getBrowser();
    // deviceScaleFactor=1 で stage の CSS px と PNG px を一致させる（rgba 等長の前提）。
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    try {
      await page.setContent(buildHarnessHtml({ imageDataUrl, waapi, viewport }), {
        waitUntil: "load",
      });
      await page.waitForFunction(() => (window as any).__captureReady === true, {
        timeout: 10_000,
      });

      const measuredDurationMs = (await page.evaluate(
        () => (window as any).__capture.measure() as number,
      )) as number;

      const stage = page.locator("#stage");
      const frames: CapturedFrame[] = [];

      for (const at of ats) {
        // write: seek（currentTime 設定 + レイアウト確定）
        await page.evaluate((a) => (window as any).__capture.seek(a), at);
        // read: bbox + opacity をまとめて1回（write と分離）
        const read = (await page.evaluate(
          () => (window as any).__capture.read() as LayerRead,
        )) as LayerRead;
        // 実描画 PNG（SoT）
        const pngBuf = await stage.screenshot({ type: "png" });
        const rgba = PNG.sync.read(pngBuf).data;

        frames.push({
          at,
          png: new Uint8Array(pngBuf),
          rgba: new Uint8Array(rgba),
          bbox: { x: read.x, y: read.y, width: read.width, height: read.height },
          opacity: read.opacity,
        });
      }

      return { frames, measuredDurationMs };
    } finally {
      await context.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
