// S1 のレイヤー状態。ブラウザ内プレビューは blob: URL で即時表示する。
// 将来（S2 以降）: PreviewLayer を workspace/<id>/uploads/ へ保存し、
// 中間体DSL（spec/domain.ts の Layer, src="uploads/<fileName>"）へ写像する。

// 型のみ import = spec/domain.ts が import 可能であることの確認（zod は実行時に含めない）。
import type { Layer } from "../../spec/domain";

export interface PreviewLayer {
  /** レイヤーID（DSL の target に対応） */
  target: string;
  /** 元ファイル名（保存時に uploads/<fileName> となる） */
  fileName: string;
  /** ブラウザ即時表示用の blob: URL */
  objectUrl: string;
}

export type { Layer };
