import type { PreviewLayer } from "../state/layer";

interface Props {
  layer: PreviewLayer | null;
  onImageLoad: (naturalWidth: number, naturalHeight: number) => void;
}

// SoT = ブラウザ実描画。S1 ではアップロード画像をそのまま描画するだけ
// （DSL→WAAPI によるアニメ実行はステップ2以降）。
export function PreviewCanvas({ layer, onImageLoad }: Props) {
  return (
    <div className="canvas" data-testid="preview-canvas">
      {layer ? (
        <img
          className="canvas__img"
          src={layer.objectUrl}
          alt={layer.fileName}
          onLoad={(e) =>
            onImageLoad(
              e.currentTarget.naturalWidth,
              e.currentTarget.naturalHeight,
            )
          }
        />
      ) : (
        <p className="canvas__placeholder">
          画像をアップロードするとここに表示されます
        </p>
      )}
    </div>
  );
}
