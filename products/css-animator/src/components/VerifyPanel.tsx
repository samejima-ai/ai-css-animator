import type { CaptureReport } from "../lib/capture-shared";
import { summarizeGates } from "../lib/capture-shared";

export type VerifyStatus =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; report: CaptureReport }
  | { kind: "error"; error: string };

interface Props {
  status: VerifyStatus;
  /** DSL が有効かつ画像ありで実行可能か */
  canRun: boolean;
  onRun: () => void;
}

const fmt = (n: number) => Math.round(n * 10) / 10;

// 検証ゲート結果は「事実のみ」（at・実測値・PASS/FAIL）。美的評価語は出さない（SPEC.md F4）。
export function VerifyPanel({ status, canRun, onRun }: Props) {
  return (
    <section className="verify">
      <h2 className="panel__title">検証ゲート（決定論・5フレーム）</h2>
      <button
        type="button"
        className="verify__btn"
        disabled={!canRun || status.kind === "running"}
        onClick={onRun}
      >
        {status.kind === "running" ? "キャプチャ中…" : "キャプチャして検証"}
      </button>

      {status.kind === "error" && (
        <p className="verify__error" role="alert">
          {status.error}
        </p>
      )}

      {status.kind === "done" && <Results report={status.report} />}
    </section>
  );
}

function Results({ report }: { report: CaptureReport }) {
  const sum = summarizeGates(report.gates);
  return (
    <div className="verify__results">
      <p className="verify__summary">
        ゲート {sum.passed}/{report.gates.length} PASS
        {sum.failed > 0 ? `（${sum.failed} FAIL）` : ""}・実効 duration{" "}
        {fmt(report.measuredDurationMs)}ms
      </p>

      <ul className="gates">
        {report.gates.map((g) => (
          <li
            key={g.gate}
            className={`gate ${g.pass ? "gate--pass" : "gate--fail"}`}
          >
            <span className="gate__tag">{g.pass ? "PASS" : "FAIL"}</span>
            <span className="gate__name">{g.gate}</span>
            <span className="gate__detail">{g.detail}</span>
          </li>
        ))}
      </ul>

      <div className="frames">
        {report.frames.map((f) => (
          <figure className="frame" key={f.at}>
            <img className="frame__img" src={f.pngDataUrl} alt={`at=${f.at}`} />
            <figcaption className="frame__cap">
              t={f.at}・op={fmt(f.opacity)}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
