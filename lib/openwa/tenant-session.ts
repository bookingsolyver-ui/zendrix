import "server-only";
import { createHash, randomBytes } from "node:crypto";

// Identidade e regras (puras, sem rede nem base de dados) das sessões OpenWA POR ORGANIZAÇÃO (tenant).
//
// Porque existe: o nome da sessão era determinístico (`kf-<id truncado>`) e o OpenWA responde 409 a um nome que já
// existe. Dois cliques/separadores em simultâneo, ou uma sessão que ficou para trás depois de um reset, davam
// «O servidor do OpenWA recusou o pedido» para sempre. Agora:
//   * cada GERAÇÃO de sessão tem um nome único (hash do tenant + nonce): nunca colide, nem com um teardown
//     ainda em curso no OpenWA (DELETE devolve 409 SESSION_NAME_TEARDOWN_PENDING enquanto liberta o nome);
//   * o hash é SHA-256 do id completo (o slice de 28 caracteres antigo podia juntar dois tenants);
//   * o prefixo identifica o que é nosso e a que tenant pertence, para o garbage collector.

export const SESSION_NAME_PREFIX = "zx-";
// O OpenWA aceita 3 a 50 caracteres (letras, números, hífenes): zx- + 32 hex + - + 8 hex = 44.
const TENANT_HASH_LEN = 32;
const NONCE_LEN = 8;

// Quanto tempo uma sessão pode ficar à espera de um QR por ler antes de ser considerada abandonada.
export const QR_PENDING_TTL_MS = 10 * 60 * 1000;
// Folga para sessões do OpenWA sem linha na base de dados (criação a meio): nunca se apagam antes disto.
export const ORPHAN_GRACE_MS = 30 * 60 * 1000;
// Tempo máximo que o «lock» de criação de um tenant vale (um pedido dura no máximo 60 s).
export const LOCK_TTL_MS = 75 * 1000;

export function tenantHash(workspaceId: string): string {
  return createHash("sha256")
    .update(`zentrix-tenant:${workspaceId}`)
    .digest("hex")
    .slice(0, TENANT_HASH_LEN);
}

export function newNonce(): string {
  return randomBytes(NONCE_LEN / 2).toString("hex");
}

export function tenantSessionName(
  workspaceId: string,
  nonce: string = newNonce(),
): string {
  return `${SESSION_NAME_PREFIX}${tenantHash(workspaceId)}-${nonce}`;
}

// Nome gerado por nós? (as sessões `kf-…` antigas e as de outros sistemas no mesmo servidor NÃO são tocadas.)
export function isManagedSessionName(name: string | null | undefined): boolean {
  return (
    typeof name === "string" &&
    new RegExp(
      `^${SESSION_NAME_PREFIX}[0-9a-f]{${TENANT_HASH_LEN}}-[0-9a-f]{${NONCE_LEN}}$`,
    ).test(name)
  );
}

export function nameBelongsToTenant(
  name: string,
  workspaceId: string,
): boolean {
  return (
    isManagedSessionName(name) &&
    name.slice(
      SESSION_NAME_PREFIX.length,
      SESSION_NAME_PREFIX.length + TENANT_HASH_LEN,
    ) === tenantHash(workspaceId)
  );
}

export function isStale(
  since: Date | string | null | undefined,
  ttlMs: number,
  now: number = Date.now(),
): boolean {
  if (!since) return false;
  const t = typeof since === "string" ? Date.parse(since) : since.getTime();
  return Number.isFinite(t) && now - t > ttlMs;
}

// Decisão do que fazer a uma sessão do OpenWA durante a limpeza. Pura para se poder testar sem servidor.
export type SweepDecision = "keep" | "delete";

export function decideOrphan(input: {
  name: string;
  status: string | null;
  createdAt: string | null;
  knownInDb: boolean;
  now?: number;
}): SweepDecision {
  if (!isManagedSessionName(input.name)) return "keep"; // não é nosso
  if (input.knownInDb) return "keep"; // tem dono: o tratamento dos pendentes é feito pela linha da base de dados
  if (input.status === "ready" || input.status === "authenticating")
    return "keep"; // ligada: nunca se apaga às cegas
  if (!isStale(input.createdAt, ORPHAN_GRACE_MS, input.now)) return "keep"; // pode estar a ser criada agora
  return "delete";
}
