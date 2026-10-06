import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// AuditLogService: o único escritor do «audit_logs» (AuditEvent). Só acrescenta; um trigger SQL recusa UPDATE/DELETE
// (supabase/migrations/20261006120000_fortress_audit_immutable.sql). Nunca lança: uma auditoria que falha não parte o fluxo
// (o erro fica nos registos do servidor).

export interface AuditInput {
  workspaceId: string;
  action: string; // fortress.locked | handoff.won | merge.contacts ...
  entityType: string;
  entityId: string;
  actorUserId?: string | null;
  details?: Prisma.InputJsonValue;
}

export interface AuditSink {
  record(input: AuditInput): Promise<void>;
}

export const AuditLogService: AuditSink & { list(workspaceId: string, limit?: number): Promise<unknown[]> } = {
  async record(input) {
    try {
      await prisma.auditEvent.create({
        data: { workspaceId: input.workspaceId, action: input.action, entityType: input.entityType, entityId: input.entityId, actorUserId: input.actorUserId ?? null, details: input.details },
      });
    } catch (err) {
      console.error("[audit] falhou a gravar", input.action, err instanceof Error ? err.message : err);
    }
  },
  async list(workspaceId, limit = 100) {
    return prisma.auditEvent.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: Math.min(limit, 200) });
  },
};
