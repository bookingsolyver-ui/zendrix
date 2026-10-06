// Classificação, impressão digital e redação de erros. Puro (sem servidor): testável.
export type EventKind = "server_error" | "unauthorized" | "upstream_timeout" | "upstream_error" | "db_error" | "quota_exceeded" | "unknown";
export type Severity = "info" | "warning" | "critical";

const has = (text: string, ...needles: string[]) => needles.some((n) => text.includes(n));

// O que correu mal, a partir do erro e/ou do estado HTTP. Nunca olha ao corpo dos pedidos.
export function classifyError(err: unknown, status?: number): { kind: EventKind; severity: Severity } {
  const name = err instanceof Error ? err.name : "";
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : "";
  if (name === "TimeoutError" || name === "AbortError" || has(msg, "timed out", "timeout", "aborted due to timeout", "etimedout")) return { kind: "upstream_timeout", severity: "critical" };
  if (/^P(1\d{3}|2024|2037)$/.test(code) || has(msg, "prisma", "can't reach database", "connection pool")) return { kind: "db_error", severity: "critical" };
  if (has(msg, "fetch failed", "econnreset", "econnrefused", "enotfound", "graph.facebook.com", "openrouter", "openai")) return { kind: "upstream_error", severity: "critical" };
  if (status === 401) return { kind: "unauthorized", severity: "warning" };
  return { kind: "server_error", severity: "critical" };
}

// Tira o que varia (ids, números, hex) para o mesmo erro dar sempre a mesma impressão digital.
export function fingerprint(route: string, kind: string, message: string): string {
  const stable = message.toLowerCase().replace(/[0-9a-f]{8,}/g, "#").replace(/\d+/g, "#").replace(/\s+/g, " ").trim().slice(0, 120);
  return `${kind}|${route}|${stable}`;
}

// Segredos que podem vir dentro de uma mensagem de erro (cabeçalhos, URLs com chave, tokens).
export function scrubMessage(text: string, max = 500): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redigido]")
    .replace(/\b(sk|pk|rk|whsec|EAA|gsk)[-_A-Za-z0-9]{12,}\b/g, "[redigido]")
    .replace(/([?&](?:key|token|secret|api_key|access_token)=)[^&\s]+/gi, "$1[redigido]")
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://[redigido]")
    .slice(0, max);
}

// O caminho sem a pergunta (a query pode trazer dados) e sem ids longos.
export const safeRoute = (path: string) => path.split("?")[0].replace(/[A-Za-z0-9_-]{20,}/g, ":id").slice(0, 160);

export const ALERT_ICON: Record<Severity, string> = { critical: "🚨 CRITICAL", warning: "⚠️ WARNING", info: "💡 INFO" };

// O texto do aviso. Pura e testável. Formato do pedido: «🚨 CRITICAL: Tenant [ID] experienciou Erro 500 na Rota X. Detalhe: …»
export function alertText(e: { severity: Severity; workspaceId: string | null; workspaceName?: string | null; status?: number; route: string; kind: string; message: string }): string {
  const tenant = e.workspaceId ? `Tenant ${e.workspaceId}${e.workspaceName ? ` (${e.workspaceName})` : ""}` : "Plataforma";
  const what = e.kind === "quota_exceeded" ? "atingiu a quota" : e.status ? `experienciou Erro ${e.status}` : `experienciou ${e.kind}`;
  return `${ALERT_ICON[e.severity]}: ${tenant} ${what} na Rota ${e.route}. Detalhe: ${e.message}`.slice(0, 1800);
}

// Discord quer {content}; o Slack quer {text}. Distingue-se pelo endereço.
export function webhookBody(url: string, text: string): string {
  return JSON.stringify(/hooks\.slack\.com/.test(url) ? { text } : { content: text });
}

