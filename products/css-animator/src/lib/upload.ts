// 画像アップロードの検証（純関数・DOM非依存）。
// SPEC F1 / DONT.md §1: 1ファイル＝1レイヤー、形式は PNG / JPG / WebP に限定。
// 複数アップロード＝複数レイヤー合成は C2（スコープ外）なので構造的に拒否する。

export const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export type AcceptedType = (typeof ACCEPTED_TYPES)[number];

export interface UploadResult {
  ok: boolean;
  error?: string;
  file?: File;
}

export function validateUpload(files: FileList | File[]): UploadResult {
  const arr = Array.from(files);
  if (arr.length === 0) {
    return { ok: false, error: "ファイルが選択されていません" };
  }
  if (arr.length > 1) {
    return {
      ok: false,
      error: "1ファイル＝1レイヤーです（複数レイヤー合成は未対応・C2）",
    };
  }
  const file = arr[0];
  if (!ACCEPTED_TYPES.includes(file.type as AcceptedType)) {
    return {
      ok: false,
      error: `未対応の形式: ${file.type || "unknown"}（PNG / JPG / WebP のみ）`,
    };
  }
  return { ok: true, file };
}
