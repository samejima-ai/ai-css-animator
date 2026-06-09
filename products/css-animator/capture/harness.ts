// 決定論キャプチャ用の harness ページ（HTML 文字列）を組み立てる。
// Node 側（PerceptionAdapter）が page.setContent でこの HTML を流し込み、
// window.__capture.{seek,read,measure} を介して seek→read を駆動する。
//
// 設計（SPEC.md F3 / DONT.md §3.3）:
//  - stage = 固定サイズ（viewport）。レイヤー wrapper に contain: layout paint を既定付与。
//  - 動かすのは wrapper（transform/opacity/filter を WAAPI で適用）。SoT = この実描画。
//  - seek は currentTime を設定して pause（再生して撮らない＝マシン速度非依存）。
//  - bbox は getBoundingClientRect を stage 原点基準に補正（G3 と同座標系）。

import type { WaapiAnimation } from "../src/lib/convert";

export interface HarnessInput {
  imageDataUrl: string;
  waapi: WaapiAnimation;
  viewport: { width: number; height: number };
}

export function buildHarnessHtml(input: HarnessInput): string {
  const { imageDataUrl, waapi, viewport } = input;
  // iterations は seek 専用に 1 へ固定（currentTime を1サイクル内で走査するため）。
  // また JSON では Infinity が null 化するため、ここで明示的に1にする。
  const options = {
    duration: waapi.options.duration,
    easing: waapi.options.easing,
    fill: "both" as const,
    iterations: 1,
  };
  const data = JSON.stringify({ keyframes: waapi.keyframes, options });

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body { margin: 0; height: 100%; }
  body { background: #1e1e1e; }
  #stage {
    position: relative;
    width: ${viewport.width}px;
    height: ${viewport.height}px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1e1e1e;
  }
  /* レイヤー隔離（DONT.md §3.3）。動くのはこの wrapper。 */
  #layer { contain: layout paint; will-change: auto; }
  #img { display: block; width: 200px; height: auto; }
</style>
</head>
<body>
  <div id="stage">
    <div id="layer"><img id="img" alt="layer" /></div>
  </div>
  <script>
    (function () {
      var DATA = ${data};
      var stage = document.getElementById("stage");
      var layer = document.getElementById("layer");
      var img = document.getElementById("img");
      var anim = null;
      window.__captureReady = false;

      function start() {
        anim = layer.animate(DATA.keyframes, DATA.options);
        anim.pause();
        anim.currentTime = 0;
        window.__capture = {
          // write（seek）。現在時刻を設定して 2 フレーム分レイアウトを確定させる。
          seek: function (at) {
            anim.currentTime = DATA.options.duration * at;
            return new Promise(function (resolve) {
              requestAnimationFrame(function () {
                requestAnimationFrame(resolve);
              });
            });
          },
          // read（bbox + opacity）。seek 後にまとめて1回だけ読む（read/write 分離）。
          read: function () {
            var r = layer.getBoundingClientRect();
            var s = stage.getBoundingClientRect();
            var op = parseFloat(getComputedStyle(layer).opacity);
            return {
              x: r.left - s.left,
              y: r.top - s.top,
              width: r.width,
              height: r.height,
              opacity: Number.isFinite(op) ? op : 1,
            };
          },
          measure: function () {
            var t = anim.effect.getComputedTiming();
            return typeof t.duration === "number" ? t.duration : DATA.options.duration;
          },
        };
        window.__captureReady = true;
      }

      if (img.complete && img.naturalWidth > 0) {
        start();
      } else {
        img.addEventListener("load", start);
        img.addEventListener("error", function () {
          // 画像が無くても wrapper は動くので harness は成立させる。
          start();
        });
      }
      img.src = ${JSON.stringify(imageDataUrl)};
    })();
  </script>
</body>
</html>`;
}
