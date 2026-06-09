// active workspace（workspace/<project>/）の読み書き（Node 側）。
// animation.json ＝ AIが差分編集する唯一の source（SoT・SPEC F6 / workspace/README.md）。
// ブラウザ（モニタ）はこの state を読んで描画するだけ。人間は数値を編集しない。

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { buildDefaultDoc, sanitizeSrc } from "../src/lib/capture-shared";

/** 当面は単一の active project。命名規約の標準化は C2 継続（DONT.md §1）。 */
export const ACTIVE_PROJECT = "current";

export function workspaceDir(root: string): string {
  return join(root, "workspace", ACTIVE_PROJECT);
}
export function uploadsDir(root: string): string {
  return join(workspaceDir(root), "uploads");
}
export function animationPath(root: string): string {
  return join(workspaceDir(root), "animation.json");
}

export interface WorkspaceState {
  project: string;
  /** animation.json の生 JSON（検証はクライアント側で safeParse）。無ければ null。 */
  dsl: unknown;
  /** dsl.src（無ければ uploads/ 先頭画像）の data URL。無ければ null。 */
  imageDataUrl: string | null;
}

const IMG_RE = /\.(png|jpe?g|webp)$/i;

function mimeOf(ext: string): string {
  const e = ext.toLowerCase();
  if (e === "png") return "image/png";
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "webp") return "image/webp";
  return "application/octet-stream";
}

function resolveImageFile(root: string, dsl: unknown): string | null {
  const ups = uploadsDir(root);
  if (!existsSync(ups)) return null;
  const srcBase =
    (dsl as { layers?: { src?: string }[] } | null)?.layers?.[0]?.src
      ?.split("/")
      .pop() ?? null;
  if (srcBase && existsSync(join(ups, srcBase))) return srcBase;
  const files = readdirSync(ups).filter((f) => IMG_RE.test(f));
  return files.length ? files[0] : null;
}

export function readState(root: string): WorkspaceState {
  const animPath = animationPath(root);
  let dsl: unknown = null;
  if (existsSync(animPath)) {
    try {
      dsl = JSON.parse(readFileSync(animPath, "utf8"));
    } catch {
      dsl = null; // 壊れた JSON は null 扱い（クライアントで事実エラー表示）
    }
  }

  let imageDataUrl: string | null = null;
  const imgFile = resolveImageFile(root, dsl);
  if (imgFile) {
    const buf = readFileSync(join(uploadsDir(root), imgFile));
    const ext = imgFile.split(".").pop() ?? "png";
    imageDataUrl = `data:${mimeOf(ext)};base64,` + buf.toString("base64");
  }

  return { project: ACTIVE_PROJECT, dsl, imageDataUrl };
}

/**
 * プレビューペインからの画像投入＝文脈ハンドオフ（SPEC F6）。
 * uploads/ に実バイトを保存し、その画像に紐づく既定 animation.json を seed する
 * （＝「これをアニメする」の起点。以降は AI が差分パッチ）。
 */
export function saveUpload(
  root: string,
  fileName: string,
  dataUrl: string,
): { src: string } {
  mkdirSync(uploadsDir(root), { recursive: true });
  const src = sanitizeSrc(fileName); // uploads/<safe>.<ext>（SRC_PATTERN 適合）
  const base = src.split("/").pop() as string;
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  writeFileSync(join(uploadsDir(root), base), Buffer.from(b64, "base64"));

  const doc = buildDefaultDoc("layer_1", src);
  writeFileSync(animationPath(root), JSON.stringify(doc, null, 2) + "\n", "utf8");
  return { src };
}
