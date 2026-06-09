// ブラウザ側の capture クライアント。dev の POST /api/capture を叩き、
// 実描画キャプチャ→検証ゲート結果（事実のみ）を受け取る。実行自体は Node 側
// （PerceptionAdapter / Playwright）で行われる＝AIは自己検証の輪に入らない（SPEC.md）。

import type { CaptureReport } from "./capture-shared";

export async function requestCapture(
  dsl: unknown,
  imageDataUrl: string,
  viewport: { width: number; height: number },
): Promise<CaptureReport> {
  const res = await fetch("/api/capture", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dsl, imageDataUrl, viewport }),
  });
  const data = (await res.json().catch(() => null)) as
    | CaptureReport
    | { error?: string }
    | null;
  if (!res.ok) {
    const msg =
      data && "error" in data && data.error ? data.error : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as CaptureReport;
}
