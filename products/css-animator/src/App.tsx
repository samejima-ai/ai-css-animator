import { useState } from "react";
import { ImageUploader } from "./components/ImageUploader";
import { PreviewCanvas } from "./components/PreviewCanvas";
import type { PreviewLayer } from "./state/layer";

export default function App() {
  const [layer, setLayer] = useState<PreviewLayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  return (
    <div className="app">
      <header className="app__header">
        css-animator <span className="app__phase">S1 — 器</span>
      </header>

      <div className="app__body">
        <aside className="panel panel--left">
          <ImageUploader
            onLayer={(l) => {
              setLayer(l);
              setError(null);
              setDims(null);
            }}
            onError={(msg) => setError(msg)}
          />

          <label className="intent">
            <span className="intent__label">意図（自然言語）</span>
            <textarea
              className="intent__input"
              placeholder="例: ふわっと浮いて着地（※ S2 で DSL 差分に翻訳。現段階は未接続）"
              rows={3}
              disabled
            />
          </label>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </aside>

        <main className="canvas-wrap">
          <PreviewCanvas
            layer={layer}
            onImageLoad={(w, h) => setDims({ w, h })}
          />
        </main>

        <aside className="panel panel--right">
          <h2 className="panel__title">レイヤー情報（事実）</h2>
          {layer ? (
            <dl className="facts">
              <dt>target</dt>
              <dd>{layer.target}</dd>
              <dt>file</dt>
              <dd>{layer.fileName}</dd>
              <dt>natural</dt>
              <dd>{dims ? `${dims.w}×${dims.h}px` : "—"}</dd>
            </dl>
          ) : (
            <p className="facts facts--empty">画像未選択</p>
          )}
        </aside>
      </div>
    </div>
  );
}
