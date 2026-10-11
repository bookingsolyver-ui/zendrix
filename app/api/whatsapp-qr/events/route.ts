import { authErrorResponse } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { requireRole } from "@/lib/rbac";
import { readTenantQr } from "@/lib/openwa/session-manager";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Canal SSE do painel: estado do QR (gerado / a ligar / ligado / perdido) SÓ da organização autenticada. Não há
// canal partilhado nem identificador no URL: o fluxo nasce do cookie da sessão, por isso uma organização não
// consegue subscrever outra. Corre numa função serverless, logo cada ligação dura ~50 s e o EventSource do browser
// reconecta sozinho (`retry:`). O polling de /status fica como alternativa.
const TICK_MS = 2_000;
const MAX_LIFETIME_MS = 50_000;

export async function GET(request: Request) {
  let workspaceId: string;
  try {
    workspaceId = (await requireRole(["OWNER", "MANAGER"])).workspaceId;
  } catch (err) {
    return authErrorResponse(err) ?? new Response("internal", { status: 500 });
  }
  const limited = await rateLimit(`wa-qr-events:${workspaceId}`, {
    limit: 40,
    windowMs: 10 * 60 * 1000,
  });
  if (!limited.ok)
    return new Response("rate_limited", {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSeconds) },
    });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const started = Date.now();
      let last = "";
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* já fechado */
        }
      };
      const send = (event: string, data: unknown) => {
        if (!closed)
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
      };
      request.signal.addEventListener("abort", close); // o utilizador fechou a página: pára de consultar o OpenWA

      controller.enqueue(encoder.encode("retry: 1500\n\n"));
      while (!closed && Date.now() - started < MAX_LIFETIME_MS) {
        try {
          const result = await readTenantQr(workspaceId);
          const payload = result.ok
            ? { state: result.state, qr: result.qr, gone: result.gone === true }
            : {
                state: result.error === "none" ? "none" : "error",
                error: result.error,
                qr: null,
                gone: false,
              };
          const fingerprint = JSON.stringify(payload);
          if (fingerprint !== last) {
            last = fingerprint;
            send("state", payload); // só envia quando muda (o QR renova-se ~20 s)
          } else {
            controller.enqueue(encoder.encode(": ping\n\n"));
          }
          if (payload.state === "open" || payload.state === "none") break; // nada mais a esperar
        } catch {
          send("state", {
            state: "error",
            error: "internal",
            qr: null,
            gone: false,
          });
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, TICK_MS));
      }
      close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
