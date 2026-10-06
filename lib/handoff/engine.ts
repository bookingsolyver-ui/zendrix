import "server-only";
import type { Principal } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { Fortress } from "@/lib/fortress/service";
import { HANDOFF_TASKS, DEPARTMENTS, isHandoffTransition, type Stage } from "@/lib/handoff/state-machine";

// HANDOFF ENGINE. Quando um negócio passa a «Fechado Ganho» (Contact.leadStage = WON, o que o pagamento confirmado
// faz), numa ÚNICA transação:
//   1. bloqueia o registo ao vendedor (RecordLock; só se acrescenta, nunca se apaga);
//   2. cria uma tarefa de nível 1 para o Financeiro (faturar) e outra para a Logística (entregar) no quadro do CRM;
//   3. regista o handoff em AuditEvent (quem passou para quem, ao milissegundo).
// Idempotente: a chave única de RecordLock garante que o handoff só acontece uma vez, mesmo com varrimentos repetidos
// ou dois workers.
//
// Escuta a mudança de estado por varrimento (HandoffEngine.sweep, via /api/cron/handoff) porque o WON é gravado por
// código que não se altera (Stripe, bancos). Quem quiser reação imediata chama HandoffEngine.onWon(...) no sítio certo.
//
// Só corre para negócios ganhos DEPOIS de HANDOFF_SINCE (data ISO). Sem a variável, o motor está desligado: assim ligá-lo
// nunca gera tarefas para todos os clientes antigos.

const DAY_MS = 86_400_000;

export const handoffSince = (): Date | null => {
  const raw = process.env.HANDOFF_SINCE;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

export type HandoffResult = "handed_off" | "already_done" | "not_won" | "not_found";

export const HandoffEngine = {
  async onWon(workspaceId: string, contactId: string, previous: Stage | null = null): Promise<HandoffResult> {
    const contact = await prisma.contact.findFirst({ where: { id: contactId, workspaceId }, select: { id: true, name: true, waId: true, leadStage: true } });
    if (!contact) return "not_found";
    if (!isHandoffTransition(previous, contact.leadStage as Stage)) return "not_won";

    const assignment = await prisma.clientAssignment.findUnique({ where: { workspaceId_contactId: { workspaceId, contactId } }, select: { assignedToUserId: true } });
    const label = contact.name?.trim() || `+${contact.waId}`;
    const now = new Date();

    try {
      await prisma.$transaction(async (tx) => {
        // A chave única decide quem trata: se já existir, esta transação falha e nada se cria.
        await tx.recordLock.create({ data: { workspaceId, contactId, reason: "won_handoff", details: { from: assignment?.assignedToUserId ?? null, departments: [...DEPARTMENTS] } } });
        for (const department of DEPARTMENTS) {
          const spec = HANDOFF_TASKS[department];
          await tx.task.create({ data: { workspaceId, title: spec.title(label), description: `${spec.description}\nCliente: ${label} (+${contact.waId})`, priority: "HIGH", status: "TODO", dueAt: new Date(now.getTime() + spec.dueInDays * DAY_MS) } });
        }
        await tx.auditEvent.create({
          data: { workspaceId, action: "handoff.won", entityType: "contact", entityId: contactId, actorUserId: assignment?.assignedToUserId ?? null, details: { from: assignment?.assignedToUserId ?? null, to: [...DEPARTMENTS], previousStage: previous } },
        });
      });
      return "handed_off";
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") return "already_done";
      throw err;
    }
  },

  // Os negócios ganhos desde HANDOFF_SINCE que ainda não passaram por aqui.
  async sweep(limit = 200): Promise<{ scanned: number; handedOff: number; enabled: boolean }> {
    const since = handoffSince();
    if (!since) return { scanned: 0, handedOff: 0, enabled: false };
    const won = await prisma.contact.findMany({
      where: { leadStage: "WON", qualifiedAt: { gte: since }, workspace: { approvalStatus: "APPROVED", blockedAt: null } },
      orderBy: { qualifiedAt: "asc" },
      take: limit * 2,
      select: { id: true, workspaceId: true },
    });
    const locked = new Set((await prisma.recordLock.findMany({ where: { contactId: { in: won.map((c) => c.id) } }, select: { contactId: true } })).map((l) => l.contactId));
    let handedOff = 0;
    for (const contact of won.filter((c) => !locked.has(c.id)).slice(0, limit)) {
      if ((await this.onWon(contact.workspaceId, contact.id)) === "handed_off") handedOff++;
    }
    return { scanned: won.length, handedOff, enabled: true };
  },

  // Pode este principal editar o contacto? Depois do handoff só OWNER e MANAGER (o vendedor perde a edição).
  // Para usar nas rotas que editam contactos; nenhuma das existentes foi alterada.
  async canEdit(who: Principal, contactId: string): Promise<boolean> {
    if (who.role !== "STAFF") return true;
    if (await prisma.recordLock.count({ where: { workspaceId: who.workspaceId, contactId } })) return false;
    const scope = await Fortress.contactScope(who);
    return scope.kind === "all" || (scope.kind === "assigned" && scope.contactIds.includes(contactId));
  },
};
