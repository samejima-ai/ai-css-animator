// dev 専用の capture エンドポイント（POST /api/capture）。
// UI から DSL＋画像を受け、PerceptionAdapter（Playwright）で実描画キャプチャ→検証ゲートを
// 走らせ、結果（事実のみ）を JSON で返す。これにより「意図→DSL→実描画→撮影→検証」の
// 1往復が UI 上で閉じる（SPEC.md F3/F4）。production ビルドには載らない（apply: "serve"）。

import type { Plugin, Connect } from "vite";
import type { ServerResponse } from "node:http";
import { PlaywrightPerceptionAdapter } from "./perception-adapter";
import { runCapture } from "./run-capture";
import { readState, saveUpload, workspaceDir } from "./workspace";

const MAX_BODY_BYTES = 32 * 1024 * 1024; // data URL（画像）を許容する上限

function readJsonBody(req: Connect.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error(`リクエストが大きすぎます（> ${MAX_BODY_BYTES} bytes）`));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("リクエスト body が JSON ではありません"));
      }
    });
    req.on("error", reject);
  });
}

interface ZodLike {
  issues: Array<{ path: (string | number)[]; message: string }>;
}
function isZodError(e: unknown): e is ZodLike {
  return !!e && typeof e === "object" && Array.isArray((e as ZodLike).issues);
}

function errorMessage(e: unknown): string {
  if (isZodError(e)) {
    // DSL 検証エラーは「どのパスが何で落ちたか」の事実に整形する。
    return (
      "DSL 検証エラー: " +
      e.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join(" / ")
    );
  }
  return e instanceof Error ? e.message : String(e);
}

export function capturePlugin(): Plugin {
  const adapter = new PlaywrightPerceptionAdapter();
  return {
    name: "css-animator-capture",
    apply: "serve",
    configureServer(server) {
      const root = server.config.root;

      function sendJson(res: ServerResponse, status: number, body: unknown) {
        res.statusCode = status;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(body));
      }

      // GET /api/state — active workspace の DSL＋画像（モニタが描く SoT）。
      server.middlewares.use(
        "/api/state",
        (req: Connect.IncomingMessage, res: ServerResponse) => {
          if (req.method !== "GET") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }
          try {
            sendJson(res, 200, readState(root));
          } catch (e) {
            sendJson(res, 500, { error: errorMessage(e) });
          }
        },
      );

      // POST /api/upload — プレビューペインからの画像投入＝文脈ハンドオフ。
      server.middlewares.use(
        "/api/upload",
        async (req: Connect.IncomingMessage, res: ServerResponse) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }
          try {
            const body = (await readJsonBody(req)) as {
              fileName: string;
              dataUrl: string;
            };
            const { src } = saveUpload(root, body.fileName, body.dataUrl);
            sendJson(res, 200, { ok: true, src });
          } catch (e) {
            sendJson(res, 400, { error: errorMessage(e) });
          }
        },
      );

      // POST /api/capture — 決定論キャプチャ→非AI検証ゲート（事実のみ）。
      server.middlewares.use(
        "/api/capture",
        async (req: Connect.IncomingMessage, res: ServerResponse) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("Method Not Allowed");
            return;
          }
          try {
            const body = (await readJsonBody(req)) as {
              dsl: unknown;
              imageDataUrl: string;
              viewport?: { width: number; height: number };
            };
            const report = await runCapture(
              {
                dsl: body.dsl,
                imageDataUrl: body.imageDataUrl,
                viewport: body.viewport,
              },
              adapter,
            );
            sendJson(res, 200, report);
          } catch (e) {
            sendJson(res, 400, { error: errorMessage(e) });
          }
        },
      );

      // animation.json / uploads/ の変化（＝AI がファイルを差分パッチ）を
      // モニタへ通知し再取得させる（HMR 的に「AI編集→即描画反映」）。
      const wsRoot = workspaceDir(root);
      server.watcher.add(wsRoot);
      const notify = (file: string) => {
        if (file.startsWith(wsRoot)) {
          server.ws.send({ type: "custom", event: "css-animator:state" });
        }
      };
      server.watcher.on("change", notify);
      server.watcher.on("add", notify);
      server.watcher.on("unlink", notify);

      // dev サーバ終了時にブラウザを解放する。
      server.httpServer?.once("close", () => {
        void adapter.close();
      });
    },
  };
}
