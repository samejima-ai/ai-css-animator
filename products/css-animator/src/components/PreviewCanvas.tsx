import { useEffect, useRef } from "react";
import type { Layer } from "../../spec/domain";
import { applyAnimation } from "../lib/play";

interface Props {
  /** live プレビュー用の画像 URL（人間の連続視認） */
  objectUrl: string | null;
  /** 検証済み DSL レイヤー（無効/未入力なら null＝静止表示） */
  layer: Layer | null;
  /** reduced-motion プレビュー（DONT.md §4: 動かさず確認する） */
  reducedMotion: boolean;
  /** 再生ボタンで増える。同一 DSL の再実行トリガー。 */
  replayKey: number;
  onImageLoad: (naturalWidth: number, naturalHeight: number) => void;
}

// SoT = ブラウザ実描画。layer（DSL）が有効なら WAAPI で wrapper を動かす。
// 動かすのは contain: layout paint で隔離した wrapper（DONT.md §3.3）。
export function PreviewCanvas({
  objectUrl,
  layer,
  reducedMotion,
  replayKey,
  onImageLoad,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !layer || reducedMotion) return;
    // DSL 変更 → 即描画反映（HMR 的な体感即時。SPEC.md UX制約 Must）。
    const anim = applyAnimation(el, layer);
    return () => anim.cancel();
  }, [layer, reducedMotion, replayKey, objectUrl]);

  return (
    <div className="canvas" data-testid="preview-canvas">
      {objectUrl ? (
        <div className="stage">
          <div className="stage__layer" ref={wrapRef}>
            <img
              className="canvas__img"
              src={objectUrl}
              alt="preview layer"
              onLoad={(e) =>
                onImageLoad(
                  e.currentTarget.naturalWidth,
                  e.currentTarget.naturalHeight,
                )
              }
            />
          </div>
        </div>
      ) : (
        <p className="canvas__placeholder">
          画像をアップロードするとここに表示されます
        </p>
      )}
    </div>
  );
}
