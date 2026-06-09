// 非AI検証ゲート（純ロジック・環境非依存）。sensors/computational.md G1〜G7 のうち
// ブラウザ非依存に計算できる部分を実装する。入力は「キャプチャ済みデータ」であり、
// 取得手段（PerceptionAdapter の web 実装 / desktop 実装）を問わない（SPEC.md F4）。
//
// 出力は事実のみ（pass/detail）。美的評価語は出さない（SPEC.md F4）。

import type { Layer } from "../../spec/domain";
import { BLUR_MAX_PX } from "../../spec/domain";
import { sampleAt } from "./convert";

export interface GateResult {
  gate: string;
  pass: boolean;
  detail: string;
}

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Viewport {
  width: number;
  height: number;
}
export interface CapturedFrame {
  at: number;
  bbox: BBox;
}

/** G2: 全 keyframe の blur ≤ BLUR_MAX_PX（DSL 上で決定論判定） */
export function gateBlurCap(layer: Layer): GateResult {
  for (const k of layer.keyframes) {
    if (k.blur === undefined) continue;
    if (!Number.isFinite(k.blur)) {
      // 非有限値は「上限以前の入力異常」として安全側（FAIL）に倒す。
      return {
        gate: "G2 blur-cap",
        pass: false,
        detail: `at=${k.at} blur=${k.blur}（非有限値・入力異常）`,
      };
    }
    if (k.blur > BLUR_MAX_PX) {
      return {
        gate: "G2 blur-cap",
        pass: false,
        detail: `at=${k.at} blur=${k.blur}px > ${BLUR_MAX_PX}px`,
      };
    }
  }
  return { gate: "G2 blur-cap", pass: true, detail: `全 blur ≤ ${BLUR_MAX_PX}px` };
}

/** G3: 全フレームの bbox が viewport 矩形内に収まる */
export function gateOffscreen(
  frames: CapturedFrame[],
  vp: Viewport,
): GateResult {
  if (
    !Number.isFinite(vp.width) ||
    !Number.isFinite(vp.height) ||
    vp.width < 0 ||
    vp.height < 0
  ) {
    return {
      gate: "G3 offscreen",
      pass: false,
      detail: `viewport 異常 [${vp.width}x${vp.height}]（非有限/負・入力異常）`,
    };
  }
  for (const f of frames) {
    const { x, y, width, height } = f.bbox;
    if (![x, y, width, height].every(Number.isFinite) || width < 0 || height < 0) {
      // 非有限値・負の寸法はキャプチャ異常として FAIL（比較すり抜けによる誤 PASS を防ぐ）。
      return {
        gate: "G3 offscreen",
        pass: false,
        detail: `at=${f.at} bbox 異常 [${x},${y},${width},${height}]（非有限/負・入力異常）`,
      };
    }
    const right = x + width;
    const bottom = y + height;
    if (x < 0 || y < 0 || right > vp.width || bottom > vp.height) {
      return {
        gate: "G3 offscreen",
        pass: false,
        detail: `at=${f.at} bbox=[${x},${y},${right},${bottom}] ⊄ viewport[0,0,${vp.width},${vp.height}]`,
      };
    }
  }
  return { gate: "G3 offscreen", pass: true, detail: "全フレーム viewport 内" };
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** G4: フレーム pixel が全同一でない（静止バグ＝アニメ死亡の検出） */
export function gateNotStatic(
  frames: Array<{ at: number; pixels: Uint8Array }>,
): GateResult {
  if (frames.length < 2) {
    return {
      gate: "G4 not-static",
      pass: false,
      detail: `フレーム数=${frames.length}（2 未満で比較不可）`,
    };
  }
  // 解像度（pixel 長）不一致は同一条件比較の前提を満たさない＝キャプチャ異常として FAIL。
  const len = frames[0].pixels.length;
  if (frames.some((f) => f.pixels.length !== len)) {
    return {
      gate: "G4 not-static",
      pass: false,
      detail: `フレーム間で pixel 長不一致（解像度不一致・入力異常）`,
    };
  }
  const first = frames[0].pixels;
  const allSame = frames.every((f) => bytesEqual(f.pixels, first));
  return allSame
    ? {
        gate: "G4 not-static",
        pass: false,
        detail: `全 ${frames.length} フレームが pixel 同一（差分ゼロ）`,
      }
    : { gate: "G4 not-static", pass: true, detail: "フレーム間に差分あり" };
}

/** G5: 実効 duration が DSL の duration_ms と一致（許容誤差 toleranceMs） */
export function gateDuration(
  layer: Layer,
  measuredMs: number,
  toleranceMs = 16,
): GateResult {
  const diff = Math.abs(measuredMs - layer.duration_ms);
  return diff <= toleranceMs
    ? {
        gate: "G5 duration",
        pass: true,
        detail: `実効=${measuredMs}ms DSL=${layer.duration_ms}ms 差=${diff}ms ≤ ${toleranceMs}ms`,
      }
    : {
        gate: "G5 duration",
        pass: false,
        detail: `実効=${measuredMs}ms DSL=${layer.duration_ms}ms 差=${diff}ms > ${toleranceMs}ms`,
      };
}

/**
 * G6: DSL 上 opacity>0 を期待する at で、測定 opacity が ~0（透明バグ）になっていない。
 * measured は各 at の実測 opacity。
 */
export function gateOpacity(
  layer: Layer,
  measured: Array<{ at: number; opacity: number }>,
  epsilon = 0.01,
): GateResult {
  for (const m of measured) {
    if (!Number.isFinite(m.opacity)) {
      // 非有限の測定値は透明バグ判定以前の入力異常として FAIL。
      return {
        gate: "G6 opacity",
        pass: false,
        detail: `at=${m.at} 実測 opacity=${m.opacity}（非有限値・入力異常）`,
      };
    }
    const expected = sampleAt(layer, m.at).opacity;
    if (expected > epsilon && m.opacity <= epsilon) {
      return {
        gate: "G6 opacity",
        pass: false,
        detail: `at=${m.at} 期待 opacity=${expected} だが実測=${m.opacity}（透明バグ）`,
      };
    }
  }
  return { gate: "G6 opacity", pass: true, detail: "意図せぬ透明なし" };
}
