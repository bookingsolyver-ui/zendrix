import "server-only";
import { classifyMetaFailure, type MetaFailure } from "@/lib/meta/errors";
import { buildTextRequest, type MetaAccount } from "@/lib/meta/request";
import type { PlatformName } from "@/lib/outbox/split-text";

// O ÚNICO sítio que fala com a Graph API da Meta para enviar texto. Só o worker da fila (lib/outbox) o usa.

// A versão da Graph API. 17.0 é a que o resto do projeto já usa; META_GRAPH_VERSION permite subir sem código.
// META_GRAPH_URL só serve para testes (um servidor falso); por omissão é a Graph API da Meta.
export const GRAPH_BASE = process.env.META_GRAPH_URL?.trim() || `https://graph.facebook.com/${process.env.META_GRAPH_VERSION?.trim() || "v17.0"}`;
const TIMEOUT_MS = 15_000;

export type MetaSendResult =
  | { ok: true; externalId: string | null }
  | { ok: false; failure: MetaFailure; detail: string };

export async function sendTextToMeta(
  platform: PlatformName,
  account: MetaAccount & { accessToken: string },
  to: string,
  text: string,
): Promise<MetaSendResult> {
  const request = buildTextRequest(platform, account, to, text);

  let res: Response;
  try {
    res = await fetch(`${GRAPH_BASE}/${request.path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${account.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(request.body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    // Timeout ou sem ligação: a mensagem pode ou não ter chegado à Meta; tentar de novo é o risco menor.
    return { ok: false, failure: classifyMetaFailure({ network: true }), detail: err instanceof Error ? err.name : "network" };
  }

  const data: unknown = await res.json().catch(() => null);
  if (res.ok) return { ok: true, externalId: request.externalId(data) };

  const error = (data as { error?: { code?: unknown; message?: unknown } } | null)?.error;
  const code = typeof error?.code === "number" ? error.code : undefined;
  return {
    ok: false,
    failure: classifyMetaFailure({ httpStatus: res.status, code }),
    detail: (typeof error?.message === "string" ? error.message : `HTTP ${res.status}`).slice(0, 300),
  };
}
