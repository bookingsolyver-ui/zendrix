import "server-only";
import { NextResponse } from "next/server";
import type { Principal } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { AuditLogService, type AuditSink } from "@/lib/fortress/audit";
import { decideProfileAccess, PROFILE_LIMIT, PROFILE_WINDOW_MS, profileBucketKey } from "@/lib/fortress/anomaly";
import { NotificationService } from "@/lib/alerts/notification-service";
import { ownerRecipients, queueNotification } from "@/lib/email/notify";

// KWANZA FLOW FORTRESS. Dois escudos, ambos opt-in (cada rota nova chama-os; nada existente foi alterado):
//  * Escopo (FortressScope): um vendedor (STAFF) só vê os clientes que lhe estão atribuídos (ClientAssignment).
//  * Anti-Export (guardProfileAccess): quem abrir mais de 50 perfis num minuto leva HTTP 429, a conta fica bloqueada
//    (UserLock), regista-se em AuditEvent e os proprietários são avisados. OWNER está isento (não haveria quem desbloqueasse).
//
// Dependências injetáveis (testes, ou trocar o canal de alerta): createFortress({ audit, alertAdmins }).

export interface FortressDeps {
  audit: AuditSink;
  alertAdmins(workspaceId: string, subject: string, body: string, dedupeKey: string): Promise<void>;
}

const defaultDeps: FortressDeps = {
  audit: AuditLogService,
  async alertAdmins(workspaceId, subject, body, dedupeKey) {
    await NotificationService.notify({ workspaceId, kind: "security", severity: "critical", title: subject, body, dedupeKey }).catch(() => {});
    for (const owner of await ownerRecipients(workspaceId).catch(() => [])) {
      await queueNotification({ kind: "system_notice", dedupeKey, to: owner.email, locale: owner.locale, workspaceId, payload: { name: owner.name ?? owner.email, kind: "notice", content: { pt: { subject, body } } } }).catch(() => {});
    }
  },
};

export type ContactScope = { kind: "all" } | { kind: "assigned"; contactIds: string[] } | { kind: "none" };

export function createFortress(deps: FortressDeps = defaultDeps) {
  // O User.id de quem faz o pedido (o Principal só traz o e-mail). Chaves de API não têm utilizador.
  async function resolveUserId(who: Principal): Promise<string | null> {
    if (who.kind !== "user" || !who.userEmail) return null;
    const user = await prisma.user.findFirst({ where: { email: who.userEmail, workspaceId: who.workspaceId }, select: { id: true } });
    return user?.id ?? null;
  }

  return {
    resolveUserId,

    async isLocked(workspaceId: string, userId: string) {
      return (await prisma.userLock.count({ where: { workspaceId, userId, unlockedAt: null } })) > 0;
    },

    // Que clientes este principal pode ver. Chaves de API STAFF sem utilizador não veem nada (privilégio mínimo).
    async contactScope(who: Principal): Promise<ContactScope> {
      if (who.role !== "STAFF") return { kind: "all" };
      const userId = await resolveUserId(who);
      if (!userId) return { kind: "none" };
      const rows = await prisma.clientAssignment.findMany({ where: { workspaceId: who.workspaceId, assignedToUserId: userId }, select: { contactId: true } });
      return { kind: "assigned", contactIds: rows.map((r) => r.contactId) };
    },

    // Fragmento `where` do Prisma para listar contactos dentro do escopo.
    async contactWhere(who: Principal) {
      const scope = await this.contactScope(who);
      return scope.kind === "all" ? { workspaceId: who.workspaceId } : { workspaceId: who.workspaceId, id: { in: scope.kind === "assigned" ? scope.contactIds : [] } };
    },

    // Chamar ANTES de devolver `count` perfis de clientes. Devolve uma resposta de erro (423 bloqueado / 429) ou null (pode seguir).
    async guardProfileAccess(who: Principal, count = 1): Promise<NextResponse | null> {
      if (who.role === "OWNER") return null;
      const userId = await resolveUserId(who);
      if (!userId) return null; // chaves de API têm o seu próprio limitador (lib/api-auth.ts)

      if (await this.isLocked(who.workspaceId, userId)) return NextResponse.json({ success: false, error: "account_locked" }, { status: 423 });

      // Contador atómico na tabela de limites que já existe (UMA instrução: dois pedidos simultâneos nunca leem o mesmo valor).
      const windowSeconds = PROFILE_WINDOW_MS / 1000;
      const rows = await prisma.$queryRaw<{ count: number; retry: number }[]>`
        INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
        VALUES (${profileBucketKey(who.workspaceId, userId)}::text, ${count}::int, timezone('utc', now()) + make_interval(secs => ${windowSeconds}::float8))
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE WHEN "RateLimitBucket"."resetAt" <= timezone('utc', now()) THEN ${count}::int ELSE "RateLimitBucket"."count" + ${count}::int END,
          "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= timezone('utc', now()) THEN timezone('utc', now()) + make_interval(secs => ${windowSeconds}::float8) ELSE "RateLimitBucket"."resetAt" END
        RETURNING "count", CEIL(GREATEST(EXTRACT(EPOCH FROM ("resetAt" - timezone('utc', now()))), 0))::int AS "retry"`;
      const row = rows[0];
      if (!row || decideProfileAccess(row.count).allowed) return null;

      await this.lock(who, userId, `Acedeu a ${row.count} perfis em menos de ${windowSeconds} s (limite ${PROFILE_LIMIT}).`);
      return NextResponse.json({ success: false, error: "too_many_profile_reads" }, { status: 429, headers: { "Retry-After": String(Math.max(1, Number(row.retry))) } });
    },

    async lock(who: Principal, userId: string, reason: string) {
      // Só um bloqueio ativo por utilizador (sem corrida entre pedidos paralelos).
      const exists = await prisma.userLock.findFirst({ where: { workspaceId: who.workspaceId, userId, unlockedAt: null }, select: { id: true } });
      if (exists) return;
      await prisma.userLock.create({ data: { workspaceId: who.workspaceId, userId, reason } });
      await deps.audit.record({ workspaceId: who.workspaceId, action: "fortress.locked", entityType: "user", entityId: userId, actorUserId: null, details: { reason, by: who.userEmail ?? null } });
      await deps.alertAdmins(who.workspaceId, "Conta bloqueada por atividade suspeita", `${who.userEmail ?? "Um utilizador"} foi bloqueado: ${reason} Reveja e desbloqueie se foi engano.`, `fortress:${userId}:${new Date().toISOString().slice(0, 13)}`);
    },

    async unlock(workspaceId: string, userId: string, byUserId: string | null) {
      const result = await prisma.userLock.updateMany({ where: { workspaceId, userId, unlockedAt: null }, data: { unlockedAt: new Date(), unlockedBy: byUserId } });
      if (result.count > 0) await deps.audit.record({ workspaceId, action: "fortress.unlocked", entityType: "user", entityId: userId, actorUserId: byUserId });
      return result.count;
    },
  };
}

export const Fortress = createFortress();
