// 環境非依存の共有定義（ブラウザ client と Node capture サーバの双方が import）。
// 純ロジックのみ。Playwright/DOM/Node API には依存しない（vitest で検証可能）。

import type { AnimationDoc } from "../../spec/domain";
import type { GateResult } from "./gates";

/** 決定論キャプチャの seek 時刻（SPEC.md F3: t∈{0,.25,.5,.75,1}） */
export const CAPTURE_ATS = [0, 0.25, 0.5, 0.75, 1] as const;

/** キャプチャ stage（=viewport）の既定サイズ。検証の決定論前提として固定する。 */
export const CAPTURE_VIEWPORT = { width: 640, height: 480 } as const;

/** 1フレーム分の検証結果メタ（client へ返す。png は base64・人間サムネ用）。 */
export interface CaptureFrameMeta {
  at: number;
  /** stage 座標系でのレイヤー矩形（G3 入力と同座標系） */
  bbox: { x: number; y: number; width: number; height: number };
  /** 実測 computed opacity（G6 入力） */
  opacity: number;
  /** stage の実描画 PNG（data URL）。人間サムネ＝SoT の可視化 */
  pngDataUrl: string;
}

/** /api/state のレスポンス＝モニタが描く SoT（AIが編集する workspace の現在値）。 */
export interface MonitorState {
  project: string;
  /** animation.json の生 JSON（クライアントで safeParse）。無ければ null。 */
  dsl: unknown;
  /** 対象画像の data URL。無ければ null。 */
  imageDataUrl: string | null;
}

/** /api/capture のレスポンス（事実のみ。美的評価語は持たない・SPEC.md F4）。 */
export interface CaptureReport {
  gates: GateResult[];
  frames: CaptureFrameMeta[];
  measuredDurationMs: number;
}

/** ゲート結果の集計（事実のカウントのみ）。 */
export function summarizeGates(gates: GateResult[]): {
  passed: number;
  failed: number;
  allPass: boolean;
} {
  const passed = gates.filter((g) => g.pass).length;
  const failed = gates.length - passed;
  return { passed, failed, allPass: failed === 0 };
}

/**
 * ファイル名 → DSL の src（`uploads/<name>` 形式・SRC_PATTERN 適合）へ正規化する。
 * 実画像バイトは別途 dataURL で渡すため、src はあくまで識別子（DONT.md §3.1 の
 * パストラバーサル拒否に適合させる）。許可外文字（空白・括弧等）は `_` に潰す。
 */
export function sanitizeSrc(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const ext = (dot >= 0 ? fileName.slice(dot + 1) : "png").toLowerCase();
  const safeExt = /^(png|jpe?g|webp)$/.test(ext) ? ext : "png";
  const base = (dot >= 0 ? fileName.slice(0, dot) : fileName)
    .replace(/[^\w.-]/g, "_")
    .replace(/^[-.]+/, "") // 先頭の . や - を除去（[\w.-]+ の語頭安定化）
    || "image";
  return `uploads/${base}.${safeExt}`;
}

/**
 * アップロード済みレイヤーに対する既定 DSL（「ふわっと浮いて着地」）。
 * 人間が DSL エディタで自由に書き換える起点。easing は per-segment 暫定（L0 申し送り）。
 */
export function buildDefaultDoc(target: string, src: string): AnimationDoc {
  return {
    layers: [
      {
        target,
        src,
        duration_ms: 1200,
        easing: "ease-out",
        iteration: 1,
        keyframes: [
          { at: 0, x: 0, y: 0, rotate: 0, scale: 1, opacity: 0, blur: 2 },
          { at: 0.5, y: -80 },
          { at: 1, y: 0, scale: 1.05, opacity: 1, blur: 0 },
        ],
      },
    ],
  };
}
