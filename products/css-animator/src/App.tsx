import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageUploader } from "./components/ImageUploader";
import { PreviewCanvas } from "./components/PreviewCanvas";
import { VerifyPanel, type VerifyStatus } from "./components/VerifyPanel";
import { safeLoadAnimationDoc } from "./lib/dsl";
import { requestCapture } from "./lib/capture-client";
import { fetchState, uploadImage } from "./lib/monitor-client";
import { CAPTURE_VIEWPORT, type MonitorState } from "./lib/capture-shared";

// ブラウザ＝モニタ（SPEC F6）。active workspace の animation.json を読んで描くだけ。
// 編集（DSL差分パッチ）は AI がファイル側で行う＝ここに DSL エディタは無い。
export default function App() {
  const [state, setState] = useState<MonitorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [verify, setVerify] = useState<VerifyStatus>({ kind: "idle" });
  const [cardsVisible, setCardsVisible] = useState(true);

  const refetch = useCallback(() => {
    fetchState()
      .then((s) => {
        setState(s);
        setError(null);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  // 初回ロード。
  useEffect(() => {
    refetch();
  }, [refetch]);

  // AI が animation.json / uploads を書き換えたらモニタを再取得（編集→即描画反映）。
  useEffect(() => {
    const hot = import.meta.hot;
    if (!hot || typeof hot.on !== "function") return;
    const handler = () => refetch();
    hot.on("css-animator:state", handler);
    return () => {
      if (typeof hot.off === "function") hot.off("css-animator:state", handler);
    };
  }, [refetch]);

  const parsed = useMemo(
    () => (state?.dsl != null ? safeLoadAnimationDoc(state.dsl) : null),
    [state],
  );
  const layer = parsed?.success ? parsed.data.layers[0] : null;
  const dslError =
    parsed && !parsed.success
      ? parsed.error.issues
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join(" / ")
      : null;

  const imageDataUrl = state?.imageDataUrl ?? null;
  const srcName = layer?.src.split("/").pop() ?? null;

  async function onPick(fileName: string, dataUrl: string) {
    setError(null);
    setVerify({ kind: "idle" });
    try {
      await uploadImage(fileName, dataUrl);
      refetch(); // watcher も通知するが即時反映のため明示再取得
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const canRun =
    layer !== null && imageDataUrl !== null && verify.kind !== "running";

  async function runVerify() {
    if (!layer || !imageDataUrl || !state) return;
    setVerify({ kind: "running" });
    try {
      const report = await requestCapture(state.dsl, imageDataUrl, {
        ...CAPTURE_VIEWPORT,
      });
      setVerify({ kind: "done", report });
    } catch (e) {
      setVerify({ kind: "error", error: (e as Error).message });
    }
  }

  return (
    <div className="app">
      {/* モニタ＝全面のキャンバス（主役）。chrome は前面の半透明カードで浮かせる。 */}
      <PreviewCanvas
        objectUrl={imageDataUrl}
        layer={reducedMotion ? null : layer}
        reducedMotion={reducedMotion}
        replayKey={replayKey}
        onImageLoad={(w, h) => setDims({ w, h })}
      />

      <button
        type="button"
        className="hud-toggle"
        aria-pressed={cardsVisible}
        onClick={() => setCardsVisible((v) => !v)}
        title="カードの表示／非表示"
      >
        {cardsVisible ? "▣ カードを隠す" : "▢ カードを表示"}
      </button>

      {!cardsVisible ? null : (
        <>
      <div className="hud--title">
        css-animator<span className="hud__sub">monitor</span>
      </div>

      <section className="card card--input">
        <ImageUploader onPick={onPick} onError={setError} />

        <p className="hint">
          編集はチャットで「こうしたい」と伝えてくださいぃ。AI が
          <code>animation.json</code> を書き換えると、ここに即反映されます。
        </p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {imageDataUrl && (
          <div className="controls">
            <label className="controls__row">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
              />
              <span>reduced-motion で確認（動かさない）</span>
            </label>
            <button
              type="button"
              className="controls__replay"
              disabled={reducedMotion || !layer}
              onClick={() => setReplayKey((k) => k + 1)}
            >
              ▶ もう一度再生
            </button>
          </div>
        )}
      </section>

      <section className="card card--info">
        <h2 className="panel__title">レイヤー情報（事実）</h2>
        {imageDataUrl ? (
          <dl className="facts">
            <dt>project</dt>
            <dd>{state?.project}</dd>
            <dt>file</dt>
            <dd>{srcName ?? "—"}</dd>
            <dt>natural</dt>
            <dd>{dims ? `${dims.w}×${dims.h}px` : "—"}</dd>
            <dt>dsl</dt>
            <dd>{dslError ? `✗ ${dslError}` : "✓ スキーマ適合"}</dd>
          </dl>
        ) : (
          <p className="facts facts--empty">画像未選択</p>
        )}

        {imageDataUrl && (
          <VerifyPanel status={verify} canRun={canRun} onRun={runVerify} />
        )}
      </section>
        </>
      )}
    </div>
  );
}
