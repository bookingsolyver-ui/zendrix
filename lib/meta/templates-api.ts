import "server-only";
import { GRAPH_BASE } from "@/lib/meta/send";
import { classifyMetaFailure, type MetaFailure } from "@/lib/meta/errors";
import { buildTemplateMessage } from "@/lib/templates/meta-payload";

// Graph API de modelos de mensagem do WhatsApp: criar (submeter), listar e enviar.
const TIMEOUT_MS = 20_000;

export type MetaCallResult<T> = { ok: true; data: T } | { ok: false; failure: MetaFailure; detail: string };

async function call<T>(url: string, token: string, init?: { body: unknown }): Promise<MetaCallResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}`, ...(init ? { "Content-Type": "application/json" } : {}) },
      body: init ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    return { ok: false, failure: classifyMetaFailure({ network: true }), detail: err instanceof Error ? err.name : "network" };
  }
  const data: unknown = await res.json().catch(() => null);
  if (res.ok) return { ok: true, data: data as T };
  const error = (data as { error?: { code?: unknown; message?: unknown; error_user_msg?: unknown } } | null)?.error;
  const code = typeof error?.code === "number" ? error.code : undefined;
  const message = typeof error?.error_user_msg === "string" ? error.error_user_msg : typeof error?.message === "string" ? error.message : `HTTP ${res.status}`;
  return { ok: false, failure: classifyMetaFailure({ httpStatus: res.status, code }), detail: message.slice(0, 300) };
}

export const createMetaTemplate = (wabaId: string, token: string, payload: unknown) =>
  call<{ id?: string; status?: string }>(`${GRAPH_BASE}/${wabaId}/message_templates`, token, { body: payload });

export interface MetaTemplateRow {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components?: unknown;
  rejected_reason?: string;
}

// Todas as páginas (a Meta pagina por cursor), com um teto para nunca andar em ciclo.
export async function listMetaTemplates(wabaId: string, token: string): Promise<MetaCallResult<MetaTemplateRow[]>> {
  const rows: MetaTemplateRow[] = [];
  let url: string | null = `${GRAPH_BASE}/${wabaId}/message_templates?fields=id,name,status,category,language,components,rejected_reason&limit=100`;
  for (let page = 0; url && page < 10; page++) {
    const result: MetaCallResult<{ data?: MetaTemplateRow[]; paging?: { next?: string } }> = await call(url, token);
    if (!result.ok) return result;
    rows.push(...(result.data.data ?? []));
    url = result.data.paging?.next ?? null;
  }
  return { ok: true, data: rows };
}

export async function sendTemplateToMeta(
  account: { accessToken: string; accountId: string },
  to: string,
  name: string,
  language: string,
  params: string[],
): Promise<MetaCallResult<{ externalId: string | null }>> {
  const result = await call<{ messages?: { id?: unknown }[] }>(`${GRAPH_BASE}/${account.accountId}/messages`, account.accessToken, {
    body: buildTemplateMessage(to, name, language, params),
  });
  if (!result.ok) return result;
  const id = result.data.messages?.[0]?.id;
  return { ok: true, data: { externalId: typeof id === "string" ? id : null } };
}
