// ブラウザ（モニタ）側のクライアント。active workspace の state を読み、
// プレビューペインからの画像投入（文脈ハンドオフ）をサーバへ渡す。
// 編集（animation.json の差分パッチ）は AI がファイル側で行う＝ここには無い。

import type { MonitorState } from "./capture-shared";

export async function fetchState(): Promise<MonitorState> {
  const res = await fetch("/api/state");
  if (!res.ok) throw new Error(`state HTTP ${res.status}`);
  return (await res.json()) as MonitorState;
}

export async function uploadImage(
  fileName: string,
  dataUrl: string,
): Promise<{ src: string }> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fileName, dataUrl }),
  });
  const data = (await res.json().catch(() => null)) as
    | { src: string }
    | { error?: string }
    | null;
  if (!res.ok) {
    const msg = data && "error" in data && data.error ? data.error : `upload HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as { src: string };
}
