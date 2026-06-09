// S3 capture の E2E smoke（第2層 機械検証）。実 Playwright で決定論キャプチャを回し、
// 既定 DSL（ふわっと浮いて着地）に対して全ゲートが PASS することを実データで確認する。
// 撮影フレームは delivery/screenshots/s3-capture/ に保存（人間 / Vision 判定用）。
//
// 実行: npm run capture:smoke

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { PlaywrightPerceptionAdapter } from "./perception-adapter";
import { runCapture } from "./run-capture";
import { buildDefaultDoc, summarizeGates } from "../src/lib/capture-shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "delivery", "screenshots", "s3-capture");

/** 不透明なオレンジ正方形のテスト PNG（data URL）。 */
function makeTestImageDataUrl(size = 120): string {
  const png = new PNG({ width: size, height: size });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 0xff; // R
    png.data[i + 1] = 0x8c; // G
    png.data[i + 2] = 0x1a; // B
    png.data[i + 3] = 0xff; // A（不透明）
  }
  const buf = PNG.sync.write(png);
  return "data:image/png;base64," + buf.toString("base64");
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error("SMOKE FAIL: " + msg);
}

async function main(): Promise<void> {
  const adapter = new PlaywrightPerceptionAdapter();
  try {
    const doc = buildDefaultDoc("layer_smoke", "uploads/smoke.png");
    const imageDataUrl = makeTestImageDataUrl();

    const report = await runCapture({ dsl: doc, imageDataUrl }, adapter);

    // フレーム数（5点キャプチャ）
    assert(report.frames.length === 5, `frames=${report.frames.length} (期待5)`);

    // 撮影フレームを保存（SoT の可視化）
    mkdirSync(OUT_DIR, { recursive: true });
    for (const f of report.frames) {
      const b64 = f.pngDataUrl.split(",")[1];
      writeFileSync(join(OUT_DIR, `at-${f.at}.png`), Buffer.from(b64, "base64"));
    }

    // ゲート結果（事実）を表示
    for (const g of report.gates) {
      console.log(`${g.pass ? "PASS" : "FAIL"} ${g.gate} — ${g.detail}`);
    }
    console.log(`measuredDuration=${report.measuredDurationMs}ms`);

    const sum = summarizeGates(report.gates);
    assert(
      sum.allPass,
      `既定DSLで全ゲートPASSのはず: ${report.gates
        .filter((g) => !g.pass)
        .map((g) => g.gate)
        .join(", ")}`,
    );

    // G4 not-static は「動いている」ことの核心 — 明示確認
    const g4 = report.gates.find((g) => g.gate.startsWith("G4"))!;
    assert(g4.pass, "G4 not-static が PASS でない（アニメが動いていない）");

    console.log(`\nOK: 5フレーム・全ゲートPASS。screenshots → ${OUT_DIR}`);
  } finally {
    await adapter.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
