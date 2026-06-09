// ブラウザ実行グルー（desktop の PerceptionAdapter 環境を含むブラウザでのみ動く）。
// element.animate は WAAPI 実装を要し jsdom では検証できないため、ここは薄く保ち
// ロジック本体（convert.ts）側でテストする。

import type { Layer } from "../../spec/domain";
import { toWaapi } from "./convert";

/** DSL Layer を要素に適用して Animation を返す。実描画＝SoT。 */
export function applyAnimation(el: HTMLElement, layer: Layer): Animation {
  const { keyframes, options } = toWaapi(layer);
  // WaapiKeyframe[] は DOM Keyframe[] と構造互換（translate/rotate/scale/opacity/filter）。
  return el.animate(keyframes as unknown as Keyframe[], options);
}
