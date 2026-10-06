import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// NotificationService: o ÚNICO sítio que cria e lê as notificações da aplicação (AppNotification). O motor de alertas,
// os webhooks de pagamento e o importador chamam `notify`; o <SmartAlertToast /> lê por /api/alerts.
// Idempotente: a chave única (organização + dedupeKey) faz com que o mesmo aviso nunca se repita.

export type NotificationKind = "proposal_approved" | "security" | "churn_risk" | "margin_risk" | "payment_received" | "import_done";
export type NotificationSeverity = "info" | "warning" | "critical";

export interface NotifyInput {
  workspaceId: string;
  kind: NotificationKind;
  severity?: NotificationSeverity;
  title: string;
  body: string;
  contactId?: string | null;
  dedupeKey: string;
}

export interface AppNotificationView {
  id: string;
  kind: string;
  severity: string;
  title: string;
  body: string;
  contactId: string | null;
  createdAt: string;
}

export const NotificationService = {
  // true = criada agora; false = já existia (não duplica). Nunca lança por duplicado.
  async notify(input: NotifyInput): Promise<boolean> {
    try {
      await prisma.appNotification.create({
        data: {
          workspaceId: input.workspaceId,
          kind: input.kind,
          severity: input.severity ?? "warning",
          title: input.title.slice(0, 140),
          body: input.body.slice(0, 600),
          contactId: input.contactId ?? null,
          dedupeKey: input.dedupeKey.slice(0, 200),
        },
      });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false;
      throw err;
    }
  },

  async listUnread(workspaceId: string, limit = 10): Promise<AppNotificationView[]> {
    const rows = await prisma.appNotification.findMany({
      where: { workspaceId, readAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, kind: true, severity: true, title: true, body: true, contactId: true, createdAt: true },
    });
    return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  },

  // Sempre dentro da organização: um id de outra organização não marca nada.
  async markRead(workspaceId: string, ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    const result = await prisma.appNotification.updateMany({ where: { workspaceId, id: { in: ids.slice(0, 50) }, readAt: null }, data: { readAt: new Date() } });
    return result.count;
  },
};
