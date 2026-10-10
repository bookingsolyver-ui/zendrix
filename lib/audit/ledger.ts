import "server-only";
import { after } from "next/server";
import type { Prisma } from "@prisma/client";
import type { Principal } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { redact } from "@/lib/audit/redact";
import { Fortress } from "@/lib/fortress/service";
import { getClientIp } from "@/lib/rate-limit";

// IMMUTABLE AUDIT LEDGER (KwanzaAuditLog). Singleton `AuditLedger`: envolve qualquer mutação e regista antes/depois sem
// atrasar a resposta. Só acrescenta (trigger SQL: supabase/migrations/20261007120000_audit_ledger_immutable.sql).
//
// Uso:
//   const ctx = await auditContext(request, who);
//   const updated = await AuditLedger.wrap(ctx, { entityType: "Receivable", entityId: id, action: "UPDATE" },
//     () => prisma.receivable.update({ where: { id }, data }),
//     { previous: () => prisma.receivable.findUnique({ where: { id } }) });
//
// Modos: "async" (omissão): a gravação corre DEPOIS da resposta (next/server `after`), não a atrasa. Se o processo morrer
// nesse intervalo, essa linha perde-se: aceitável para leituras/exportações. "sync": grava antes de devolver; use-o
// em ações de dinheiro ou de permissões, onde uma linha perdida não é aceitável (se a gravação falhar, lança).
// Segredos são redigidos à entrada (lib/audit/redact.ts). Uma falha de auditoria em modo async nunca parte o pedido.

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "EXPORT";
export interface AuditContext {
  workspaceId?: string | null;
  actorId?: string | null; // User.id, "apikey:<id>" ou "portal:<proposalId>"
  ip?: string | null;
}
export interface AuditMeta {
  entityType: string;
  entityId: string;
  action: AuditAction;
}
export interface WrapOptions<T> {
  previous?: () => Promise<unknown>; // estado ANTES (lido antes da mutação)
  next?: (result: T) => unknown; // estado DEPOIS (por omissão, o resultado da mutação)
  mode?: "async" | "sync";
}

// Quem faz o pedido, de onde. Chaves de API ficam como "apikey:<id>".
export async function auditContext(request: Request, who: Principal): Promise<AuditContext & { workspaceId: string }> {
  const userId = await Fortress.resolveUserId(who).catch(() => null);
  return { workspaceId: who.workspaceId, actorId: userId ?? (who.apiKeyId ? `apikey:${who.apiKeyId}` : null), ip: getClientIp(request) };
}

class AuditLedgerImpl {
  private async write(ctx: AuditContext, meta: AuditMeta, previous: unknown, next: unknown) {
    await prisma.kwanzaAuditLog.create({
      data: {
        workspaceId: ctx.workspaceId ?? null,
        entityType: meta.entityType,
        entityId: meta.entityId,
        action: meta.action,
        previousPayload: previous === undefined ? undefined : (redact(previous) as Prisma.InputJsonValue),
        newPayload: next === undefined ? undefined : (redact(next) as Prisma.InputJsonValue),
        actorId: ctx.actorId ?? null,
        ipAddress: ctx.ip ?? null,
      },
    });
  }

  record(ctx: AuditContext, meta: AuditMeta, payload: { previous?: unknown; next?: unknown } = {}, mode: "async" | "sync" = "async"): Promise<void> {
    const job = () => this.write(ctx, meta, payload.previous, payload.next);
    if (mode === "sync") return job();
    const safe = () => job().catch((err) => console.error("[audit-ledger] falhou a gravar", meta.action, meta.entityType, err instanceof Error ? err.message : err));
    try {
      after(safe); // depois de a resposta sair (e a função serverless espera por isto)
    } catch {
      void safe(); // fora de um pedido (cron, script): corre já, sem bloquear
    }
    return Promise.resolve();
  }

  async wrap<T>(ctx: AuditContext, meta: AuditMeta, mutation: () => Promise<T>, options: WrapOptions<T> = {}): Promise<T> {
    const previous = options.previous ? await options.previous().catch(() => undefined) : undefined;
    const result = await mutation(); // se a mutação falhar, nada se regista (não aconteceu)
    await this.record(ctx, meta, { previous, next: options.next ? options.next(result) : meta.action === "DELETE" ? undefined : result }, options.mode);
    return result;
  }

  // Exportações de dados pessoais (RGPD): regista quem exportou o quê e quantos registos.
  recordExport(ctx: AuditContext, entityType: string, details: { count: number; filter?: unknown }) {
    return this.record(ctx, { entityType, entityId: "*", action: "EXPORT" }, { next: details }, "sync");
  }

  async list(workspaceId: string, filter: { entityType?: string; entityId?: string; actorId?: string; before?: Date; limit?: number } = {}) {
    return prisma.kwanzaAuditLog.findMany({
      where: { workspaceId, ...(filter.entityType ? { entityType: filter.entityType } : {}), ...(filter.entityId ? { entityId: filter.entityId } : {}), ...(filter.actorId ? { actorId: filter.actorId } : {}), ...(filter.before ? { createdAt: { lt: filter.before } } : {}) },
      orderBy: { createdAt: "desc" },
      take: Math.min(filter.limit ?? 100, 200),
    });
  }
}

export const AuditLedger = new AuditLedgerImpl();
