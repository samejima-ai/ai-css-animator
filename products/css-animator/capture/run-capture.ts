// キャプチャ→検証ゲートのオーケストレーション（Node 側）。
// 決定論コア（dsl/convert/gates）は環境非依存のまま再利用し、視認だけをアダプタに委ねる。
// 出力は事実のみ（GateResult＋フレームメタ）。美的評価語は持たない（SPEC.md F4）。

import { loadAnimationDoc } from "../src/lib/dsl";
import { toWaapi } from "../src/lib/convert";
import {
  gateBlurCap,
  gateOffscreen,
  gateNotStatic,
  gateDuration,
  gateOpacity,
} from "../src/lib/gates";
import {
  CAPTURE_ATS,
  CAPTURE_VIEWPORT,
  type CaptureReport,
  type CaptureFrameMeta,
} from "../src/lib/capture-shared";
import type { PerceptionAdapter } from "./perception-adapter";

export interface RunCaptureRequest {
  /** 中間体DSL（animation.json 相当）。loadAnimationDoc で検証する。 */
  dsl: unknown;
  /** 実画像バイト（data URL）。DSL の src は識別子・実体はこちら。 */
  imageDataUrl: string;
  viewport?: { width: number; height: number };
}

/**
 * 1往復の検証部分: DSL → WAAPI → 実描画キャプチャ → 非AI検証ゲート。
 * DSL が不正なら loadAnimationDoc が ZodError を throw（呼び出し側が 400 整形）。
 */
export async function runCapture(
  req: RunCaptureRequest,
  adapter: PerceptionAdapter,
): Promise<CaptureReport> {
  const doc = loadAnimationDoc(req.dsl);
  const layer = doc.layers[0];
  const waapi = toWaapi(layer);
  const viewport = req.viewport ?? { ...CAPTURE_VIEWPORT };

  const out = await adapter.captureFrames({
    waapi,
    imageDataUrl: req.imageDataUrl,
    viewport,
    ats: CAPTURE_ATS,
  });

  // 各ゲートをキャプチャ実データで駆動（取得手段非依存・SPEC.md F4）。
  const gates = [
    gateBlurCap(layer),
    gateOffscreen(
      out.frames.map((f) => ({ at: f.at, bbox: f.bbox })),
      viewport,
    ),
    gateNotStatic(out.frames.map((f) => ({ at: f.at, pixels: f.rgba }))),
    gateDuration(layer, out.measuredDurationMs),
    gateOpacity(
      layer,
      out.frames.map((f) => ({ at: f.at, opacity: f.opacity })),
    ),
  ];

  const frames: CaptureFrameMeta[] = out.frames.map((f) => ({
    at: f.at,
    bbox: f.bbox,
    opacity: f.opacity,
    pngDataUrl: "data:image/png;base64," + Buffer.from(f.png).toString("base64"),
  }));

  return { gates, frames, measuredDurationMs: out.measuredDurationMs };
}
