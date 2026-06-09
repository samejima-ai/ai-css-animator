import { useRef } from "react";
import { validateUpload } from "../lib/upload";

interface Props {
  /** 選んだ画像を (fileName, dataUrl) で渡す。投入先（workspace 保存）は親が担う＝文脈ハンドオフ。 */
  onPick: (fileName: string, dataUrl: string) => void;
  onError: (message: string) => void;
}

// 画像はチャットでなくプレビューペインから投入する＝「これをアニメする対象」という
// 文脈ごと AI に渡す（SPEC F6）。ここは検証＋data URL 化のみ。保存は /api/upload（親）。
export function ImageUploader({ onPick, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const result = validateUpload(files);
    if (!result.ok || !result.file) {
      onError(result.error ?? "アップロードに失敗しました");
      e.target.value = "";
      return;
    }
    const file = result.file;
    const reader = new FileReader();
    reader.onload = () => onPick(file.name, String(reader.result));
    reader.onerror = () => onError("画像の読み込みに失敗しました");
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="uploader">
      <button
        type="button"
        className="uploader__btn"
        onClick={() => inputRef.current?.click()}
      >
        画像をアップロード
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleChange}
        hidden
      />
      <p className="uploader__hint">PNG / JPG / WebP・1ファイル＝1レイヤー</p>
    </div>
  );
}
