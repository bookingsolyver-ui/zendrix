import "server-only";
import { after } from "next/server";
import type { Prisma } from "@prisma/client";
import { authenticateRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { alertText, classifyError, fingerprint, safeRoute, scrubMessage, webhookBody, type EventKind, type Severity } from "@/lib/superadmin/classify";

// SaaSErrorLogger: o apanha-erros da Nave-Mãe. Regista o evento (tabela KwanzaAdmin_Event) e, se for grave, avisa a equipa
// no Discord/Slack (ALERT_WEBHOOK_URL) na hora. Nunca lança e nunca atrasa nem parte o pedido do utilizador.
//
// O que NUNCA entra: o corpo dos pedidos, cabeçalhos, a query do URL, mensagens de clientes. Só: rota, método, estado, tipo
// de erro, as primeiras linhas da mensagem (com segredos redigidos) e o id da organização.
//
// Anti-inundação: o mesmo erro (impressão digital) só avisa uma vez por 10 min, e no máximo 30 avisos por hora no total
// (se a base de dados cair, não se recebe 10 000 mensagens). O que não avisa fica na tabela à mesma.

const THROTTLE_MS = 10 * 60_000;
const HOURLY_CAP = 30;

export interface CaptureInput {
  workspaceId?: string | null;
  route: string;
  method?: string;
  status?: number;
  error?: unknown;
  kind?: EventKind;
  severity?: Severity;
  message?: string;
  details?: Record<string, unknown>;
  alert?: boolean; // forçar o aviso (ex.: quota); por omissão avisa-se o que é «critical»
  dedupeMs?: number; // janela própria (ex.: 24 h para o aviso de quota)
  fingerprintKey?: string; // para agrupar à medida (ex.: por organização e dia)
}

async function sendAlert(text: string): Promise<boolean> {
  const url = process.env.ALERT_WEBHOOK_URL?.trim();
  if (!url) return false;
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: webhookBody(url, text), signal: AbortSignal.timeout(4_000) });
    return res.ok;
  } catch {
    return false; // o aviso falhou: não se tenta resolver um erro com outro erro
  }
}

async function captureNow(input: CaptureInput): Promise<void> {
  try {
    const classified = classifyError(input.error, input.status);
    const kind = input.kind ?? classified.kind;
    const severity = input.severity ?? classified.severity;
    const route = safeRoute(input.route);
    const raw = input.message ?? (input.error instanceof Error ? `${input.error.name}: ${input.error.message}` : input.error ? String(input.error) : `HTTP ${input.status ?? "?"}`);
    const message = scrubMessage(raw);
    const print = fingerprint(route, kind, input.fingerprintKey ?? message);

    const wantsAlert = input.alert ?? severity === "critical";
    let alerted = false;
    if (wantsAlert) {
      const since = new Date(Date.now() - (input.dedupeMs ?? THROTTLE_MS));
      const [similar, lastHour] = await Promise.all([
        prisma.kwanzaAdmin_Event.count({ where: { fingerprint: print, alerted: true, createdAt: { gt: since } } }),
        prisma.kwanzaAdmin_Event.count({ where: { alerted: true, createdAt: { gt: new Date(Date.now() - 3_600_000) } } }),
      ]);
      if (similar === 0 && lastHour < HOURLY_CAP) {
        const name = input.workspaceId ? (await prisma.workspace.findUnique({ where: { id: input.workspaceId }, select: { name: true } }))?.name : null;
        alerted = await sendAlert(alertText({ severity, workspaceId: input.workspaceId ?? null, workspaceName: name, status: input.status, route, kind, message }));
      }
    }

    if (severity !== "critical" && (await prisma.kwanzaAdmin_Event.count({ where: { fingerprint: print, createdAt: { gt: new Date(Date.now() - THROTTLE_MS) } } })) > 0) return; // avisos repetidos: só um por janela

    await prisma.kwanzaAdmin_Event.create({
      data: { severity, kind, workspaceId: input.workspaceId ?? null, route, message, fingerprint: print, alerted, details: { method: input.method, status: input.status, ...(input.details ?? {}) } as Prisma.InputJsonValue },
    });
  } catch (err) {
    console.error("[saas-error-logger] falhou:", err instanceof Error ? err.message : err); // o logger nunca parte nada
  }
}

export const SaaSErrorLogger = {
  // Espera pelo registo (use em instrumentation.ts e em crons).
  capture: captureNow,

  // Não atrasa a resposta: corre depois dela (next/server `after`), ou já, fora de um pedido.
  captureAfter(input: CaptureInput): void {
    try {
      after(() => captureNow(input));
    } catch {
      void captureNow(input);
    }
  },
};

export interface CaptureOptions {
  statuses?: number[]; // estados HTTP devolvidos que também contam como falha (por omissão: todos os 5xx)
  alert401?: boolean; // webhooks e integrações: um 401 é um alarme (segredo errado); em rotas de utilizador é só uma sessão expirada
}

// Envolve um route handler. Apanha (1) exceções (volta a lançá-las: o comportamento do handler não muda) e (2) respostas 5xx
// (e 401 se pedido). A organização descobre-se SÓ no caminho de erro (sem custo no caso normal).
//   export const POST = withErrorCapture("portal/approve", async (request) => { ... });
export function withErrorCapture<A extends unknown[]>(label: string, handler: (request: Request, ...rest: A) => Promise<Response>, options: CaptureOptions = {}) {
  return async function wrapped(request: Request, ...rest: A): Promise<Response> {
    const tenantOf = async () => (await authenticateRequest(request).catch(() => null))?.workspaceId ?? null;
    const path = new URL(request.url).pathname;
    try {
      const response = await handler(request, ...rest);
      const failing = response.status >= 500 || options.statuses?.includes(response.status) || (options.alert401 && response.status === 401);
      if (failing) SaaSErrorLogger.captureAfter({ workspaceId: await tenantOf(), route: path || label, method: request.method, status: response.status, severity: response.status === 401 ? "warning" : "critical", details: { label } });
      return response;
    } catch (err) {
      SaaSErrorLogger.captureAfter({ workspaceId: await tenantOf(), route: path || label, method: request.method, status: 500, error: err, details: { label } });
      throw err;
    }
  };
}
