// DSL → WAAPI 決定論変換器（純関数・環境非依存）。
//
// 決定論変換の契約（このファイルが正典・DELIVERY で Type C として L0 に申し送り）:
//  1. 差分 keyframe の解決: 各プリミティブ（x/y/rotate/scale/opacity/blur）を
//     「そのプリミティブが明示された keyframe 列」だけで独立に線形補間する。
//     例: scale が at:0 と at:1 のみ定義なら、at:0.5 では中間値（端は clamp、未定義は default 定数）。
//  2. 全 at の和集合へリサンプル: すべての keyframe の at を集めた offset 集合上で、
//     各 offset について全プリミティブ値を解決し、完全な WAAPI keyframe を生成する。
//     → どの keyframe も transform/opacity(/filter) を完全指定するため WAAPI 入力が一意になる。
//  3. transform は個別プロパティ（translate / rotate / scale）で出力する（CSS Transforms L2）。
//     合成 transform 文字列の順序依存を避け、x/y のみ translate チャネルを共有する。
//  4. filter(blur) は blur>0 を含む場合のみ出力する（不要な合成レイヤー＝VRAM 圧迫を避ける。DONT.md §3）。
//  5. easing は WAAPI 既定どおり keyframe 区間ごとに適用される（per-segment）。
//
// 出力プロパティは transform/opacity/filter のみ＝合成フェーズ完結（S-Tier・DONT.md §3.1）。

import type { Layer, Keyframe } from "../../spec/domain";

export interface WaapiKeyframe {
  offset: number;
  translate: string; // "Xpx Ypx"
  rotate: string; // "Ndeg"
  scale: string; // "N"
  opacity: number;
  filter?: string; // "blur(Npx)" — blur 使用時のみ
  transformOrigin?: string;
}

export interface WaapiAnimation {
  keyframes: WaapiKeyframe[];
  options: {
    duration: number;
    easing: string;
    iterations: number; // "infinite" は Infinity
    fill: "both";
  };
}

export interface ResolvedFrame {
  at: number;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  opacity: number;
  blur: number;
}

const DEFAULTS = { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, blur: 0 } as const;
type Prim = keyof typeof DEFAULTS;
const PRIMS: Prim[] = ["x", "y", "rotate", "scale", "opacity", "blur"];

const round = (n: number): number => Math.round(n * 1000) / 1000;

interface Point {
  at: number;
  v: number;
}

/** keyframes から primitive p が明示された (at, value) 列を昇順抽出 */
function points(keyframes: Keyframe[], p: Prim): Point[] {
  return keyframes
    .filter((k) => k[p] !== undefined)
    .map((k) => ({ at: k.at, v: k[p] as number }))
    .sort((a, b) => a.at - b.at);
}

/** primitive の時刻 t における値を線形補間（端は clamp、未定義は default 定数） */
function valueAt(pts: Point[], t: number, def: number): number {
  if (pts.length === 0) return def;
  if (t <= pts[0].at) return pts[0].v;
  const last = pts[pts.length - 1];
  if (t >= last.at) return last.v;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (t >= a.at && t <= b.at) {
      const f = (t - a.at) / (b.at - a.at);
      return a.v + (b.v - a.v) * f;
    }
  }
  return last.v; // 到達しない
}

function primPoints(layer: Layer): Record<Prim, Point[]> {
  const out = {} as Record<Prim, Point[]>;
  for (const p of PRIMS) out[p] = points(layer.keyframes, p);
  return out;
}

/** 任意時刻 t における全プリミティブの解決値（G6 等が利用） */
export function sampleAt(layer: Layer, t: number): ResolvedFrame {
  const pp = primPoints(layer);
  return {
    at: t,
    x: valueAt(pp.x, t, DEFAULTS.x),
    y: valueAt(pp.y, t, DEFAULTS.y),
    rotate: valueAt(pp.rotate, t, DEFAULTS.rotate),
    scale: valueAt(pp.scale, t, DEFAULTS.scale),
    opacity: valueAt(pp.opacity, t, DEFAULTS.opacity),
    blur: valueAt(pp.blur, t, DEFAULTS.blur),
  };
}

/** 全 at の和集合へリサンプルした完全 keyframe 列 */
export function resolveKeyframes(layer: Layer): ResolvedFrame[] {
  const offsets = Array.from(new Set(layer.keyframes.map((k) => k.at))).sort(
    (a, b) => a - b,
  );
  return offsets.map((t) => sampleAt(layer, t));
}

/** DSL Layer → WAAPI（element.animate(keyframes, options)）への決定論変換 */
export function toWaapi(layer: Layer): WaapiAnimation {
  const frames = resolveKeyframes(layer);
  const usesBlur = frames.some((f) => f.blur > 0);

  const keyframes: WaapiKeyframe[] = frames.map((f) => {
    const kf: WaapiKeyframe = {
      offset: f.at,
      translate: `${round(f.x)}px ${round(f.y)}px`,
      rotate: `${round(f.rotate)}deg`,
      scale: `${round(f.scale)}`,
      opacity: round(f.opacity),
    };
    if (usesBlur) kf.filter = `blur(${round(f.blur)}px)`;
    if (layer.origin) kf.transformOrigin = layer.origin;
    return kf;
  });

  const iterations =
    layer.iteration === "infinite" ? Infinity : layer.iteration;

  return {
    keyframes,
    options: {
      duration: layer.duration_ms,
      easing: layer.easing,
      iterations,
      fill: "both",
    },
  };
}
