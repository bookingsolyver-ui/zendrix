import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAccess } from "@/lib/billing/access";
import { API_KEY_HEADER, hashApiKey, looksLikeApiKey } from "@/lib/api-keys";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import type { Role } from "@/lib/roles";

// Autenticação de pedidos: sessão (browser) OU chave de API (x-api-key, clientes externos).
// Devolve sempre o mesmo "Principal": quem é, de que organização, e com que papel.

export interface Principal {
  kind: "user" | "apiKey";
  workspaceId: string;
  role: Role;
  // Quem limita os pedidos: o utilizador ou a chave.
  rateKey: string;
  userEmail?: string;
  apiKeyId?: string;
}

export type AuthCode =
  | "unauthenticated"
  | "invalid_api_key"
  | "no_workspace"
  | "forbidden"
  | "rate_limited"
  | "subscription_required"
  | "account_not_approved";

export class AuthError extends Error {
  constructor(
    readonly code: AuthCode,
    readonly status: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = "AuthError";
  }
}

const API_KEY_LIMIT_PER_MINUTE = 120;
const LAST_USED_GRANULARITY_MS = 5 * 60 * 1000;

async function authenticateApiKey(rawKey: string): Promise<Principal> {
  // Mesma resposta para "não existe", "revogada" e "expirada": não se confirma a ninguém que uma chave existiu.
  const invalid = new AuthError("invalid_api_key", 401);
  if (!looksLikeApiKey(rawKey)) throw invalid;

  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(rawKey) },
    select: { id: true, workspaceId: true, role: true, revokedAt: true, expiresAt: true },
  });
  const now = Date.now();
  if (!key || key.revokedAt || (key.expiresAt && key.expiresAt.getTime() <= now)) throw invalid;

  // PAYWALL: uma chave de uma organização sem plano ativo não faz nada (402), mesmo sendo válida.
  if (!(await getAccess(key.workspaceId)).active) throw new AuthError("subscription_required", 402);

  const limited = await rateLimit(`api-key:${key.id}`, { limit: API_KEY_LIMIT_PER_MINUTE, windowMs: 60_000 });
  if (!limited.ok) throw new AuthError("rate_limited", 429, limited.retryAfterSeconds);

  // "Última utilização" com granularidade de minutos: não faz uma escrita por pedido.
  await prisma.apiKey
    .updateMany({
      where: {
        id: key.id,
        OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: new Date(now - LAST_USED_GRANULARITY_MS) } }],
      },
      data: { lastUsedAt: new Date(now) },
    })
    .catch(() => {});

  return { kind: "apiKey", workspaceId: key.workspaceId, role: key.role, rateKey: `api-key:${key.id}`, apiKeyId: key.id };
}

interface AuthOptions {
  // Aceitar x-api-key. Por omissão só se houver um Request (Server Actions não têm cabeçalhos de pedido).
  allowApiKey?: boolean;
}

// null = sem credenciais. Lança AuthError se houver credenciais inválidas (nunca "cai" para a sessão
// quando uma chave foi enviada: uma chave errada é um erro, não um convite a tentar outra via).
export async function authenticateRequest(request?: Request, options: AuthOptions = {}): Promise<Principal | null> {
  const allowApiKey = options.allowApiKey ?? request !== undefined;

  const rawKey = allowApiKey ? request?.headers.get(API_KEY_HEADER)?.trim() : undefined;
  if (rawKey) return authenticateApiKey(rawKey);

  const me = await getCurrentUser();
  if (!me) return null;
  if (!me.workspace || !me.role) throw new AuthError("no_workspace", 403);
  // Conta por aprovar (ou rejeitada): nada do produto funciona até a administração decidir.
  if (me.workspace.restriction === "pending_approval" || me.workspace.restriction === "rejected") throw new AuthError("account_not_approved", 403);
  return {
    kind: "user",
    workspaceId: me.workspace.id,
    role: me.role,
    rateKey: `user:${me.authId}`,
    userEmail: me.email,
  };
}

// Para os handlers: transforma um AuthError na resposta JSON certa; devolve null para outros erros.
export function authErrorResponse(err: unknown) {
  if (!(err instanceof AuthError)) return null;
  return NextResponse.json(
    { success: false, error: err.code },
    {
      status: err.status,
      headers: err.retryAfterSeconds ? { "Retry-After": String(err.retryAfterSeconds) } : undefined,
    },
  );
}
