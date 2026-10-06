import type { Instrumentation } from "next";

// Rede de segurança GLOBAL da Nave-Mãe: o Next chama onRequestError para qualquer erro não tratado de uma rota, ação ou página,
// sem ser preciso alterar nenhum ficheiro existente. Regista em ZetrixAdmin_Event e avisa a equipa (ALERT_WEBHOOK_URL).
// A organização só se identifica quando o pedido traz uma chave de API (x-api-key); nas sessões por cookie fica em branco aqui
// (use withErrorCapture nas rotas críticas para ter sempre o tenant). Nunca guarda cabeçalhos nem o corpo do pedido.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return; // a base de dados só existe no runtime Node
  try {
    const { SaaSErrorLogger } = await import("@/lib/superadmin/events");
    const { authenticateRequest } = await import("@/lib/api-auth");
    const apiKey = [request.headers["x-api-key"]].flat()[0];
    const workspaceId = apiKey ? ((await authenticateRequest(new Request(`http://internal${request.path}`, { headers: { "x-api-key": String(apiKey) } })).catch(() => null))?.workspaceId ?? null) : null;
    await SaaSErrorLogger.capture({ workspaceId, route: request.path, method: request.method, status: 500, error: err, details: { routeType: context.routeType, routePath: context.routePath, digest: typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : undefined } });
  } catch {
    /* o apanha-erros nunca pode causar erros */
  }
};
