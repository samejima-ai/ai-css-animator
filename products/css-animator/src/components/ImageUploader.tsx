import { useRef } from "react";
import { validateUpload } from "../lib/upload";
import type { PreviewLayer } from "../state/layer";

interface Props {
  onLayer: (layer: PreviewLayer) => void;
  onError: (message: string) => void;
}

let layerSeq = 0;

export function ImageUploader({ onLayer, onError }: Props) {
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
    const objectUrl = URL.createObjectURL(result.file);
    onLayer({
      target: `layer_${++layerSeq}`,
      fileName: result.file.name,
      objectUrl,
    });
    // 同じファイルを選び直しても change が発火するようにリセット
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
