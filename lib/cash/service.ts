import "server-only";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/alerts/notification-service";
import { buildReminder, isReminderDue, MAX_REMINDERS } from "@/lib/cash/dunning";
import { contactLabel } from "@/lib/inbox/display";
import { enqueueText } from "@/lib/outbox/enqueue";
import { drainOutbox } from "@/lib/outbox/process";
import { TenantFlags } from "@/lib/superadmin/flags";

// CASH-COLLECTOR (Dunning). Diariamente procura cobranças PENDENTES já vencidas e lembra o cliente por WhatsApp, com um
// tom que escala (amigável → firme → último aviso) conforme `remindersSent`.
//
// LIMITE REAL do WhatsApp: fora da janela de 24 h desde a última mensagem do cliente, só se podem enviar modelos aprovados
// pela Meta, e o Zetrix ainda não envia modelos. Nesses casos o lembrete NÃO sai: o dono recebe um aviso na aplicação
// («cobrança vencida, contacte à mão») e o contador não avança. Quando houver envio de modelos, é aqui que se liga.
//
// Seguro com vários workers: o lembrete é reivindicado (remindersSent+1 com condição) ANTES de enfileirar, e desfeito se o
// envio não for possível.

const BATCH = 200;

export interface DunningSummary {
  due: number;
  sent: number;
  needsManual: number;
  skipped: number;
}

export const DunningService = {
  async run(now = new Date()): Promise<DunningSummary> {
    const candidates = await prisma.receivable.findMany({
      where: { status: "PENDING", dueAt: { lt: new Date(now.getTime() - 86_400_000) }, remindersSent: { lt: MAX_REMINDERS } },
      orderBy: { dueAt: "asc" },
      take: BATCH,
    });
    const live = new Set((await prisma.workspace.findMany({ where: { id: { in: [...new Set(candidates.map((c) => c.workspaceId))] }, approvalStatus: "APPROVED", blockedAt: null }, select: { id: true } })).map((w) => w.id));
    const summary: DunningSummary = { due: 0, sent: 0, needsManual: 0, skipped: 0 };

    for (const r of candidates) {
      if (!live.has(r.workspaceId) || !isReminderDue(r, now)) continue;
      if (!(await TenantFlags.isEnabled(r.workspaceId, "cash_collector"))) continue; // torneira / flag da Nave-Mãe
      summary.due++;
      const contact = await prisma.contact.findFirst({ where: { id: r.contactId, workspaceId: r.workspaceId }, select: { id: true, name: true, waId: true, platform: true, optedOutAt: true } });
      if (!contact || contact.optedOutAt) {
        summary.skipped++; // pediu para não receber mensagens automáticas: nunca se insiste
        continue;
      }

      const claimed = await prisma.receivable.updateMany({ where: { id: r.id, status: "PENDING", remindersSent: r.remindersSent }, data: { remindersSent: r.remindersSent + 1, lastReminderAt: now } });
      if (claimed.count === 0) continue; // outro worker foi mais rápido

      const conversation = await prisma.conversation.findFirst({ where: { workspaceId: r.workspaceId, contactId: contact.id }, select: { id: true } });
      const text = buildReminder({ name: contact.name, reference: r.reference, amountMinor: r.amountMinor, currency: r.currency, dueAt: r.dueAt, paymentReference: r.paymentReference, remindersSent: r.remindersSent, now });
      const sent = conversation ? await enqueueText({ workspaceId: r.workspaceId, conversationId: conversation.id, text }) : null;

      if (sent?.ok) {
        summary.sent++;
        continue;
      }
      // Não saiu: desfaz o contador e avisa o dono para cobrar à mão (um aviso por cobrança e por dia).
      await prisma.receivable.updateMany({ where: { id: r.id, remindersSent: r.remindersSent + 1 }, data: { remindersSent: r.remindersSent, lastReminderAt: r.lastReminderAt } });
      summary.needsManual++;
      await NotificationService.notify({
        workspaceId: r.workspaceId,
        kind: "payment_received",
        severity: "warning",
        title: "Cobrança vencida por regularizar",
        body: `A fatura ${r.reference} de ${contactLabel(contact.name, contact.waId, contact.platform)} está vencida e não foi possível lembrá-lo por WhatsApp (${sent ? sent.error : "sem conversa"}). Contacte-o à mão.`,
        contactId: contact.id,
        dedupeKey: `dunning:${r.id}:${now.toISOString().slice(0, 10)}`,
      });
    }
    if (summary.sent > 0) await drainOutbox(8_000);
    return summary;
  },
};
