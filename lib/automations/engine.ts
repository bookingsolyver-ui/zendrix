import "server-only";
import { Prisma, type Automation } from "@prisma/client";
import { enqueueText } from "@/lib/outbox/enqueue";
import { applyLeadUpdate } from "@/lib/leads/service";
import { MAX_TASKS } from "@/lib/crm/schemas";
import { prisma } from "@/lib/prisma";
import {
  actionSchema,
  inCooldown,
  matchesKeyword,
  parseActions,
  parseTriggerConfig,
  renderText,
  scheduleSteps,
  type ActionConfig,
} from "@/lib/automations/schema";

// O motor das automações. Corre a partir do cron (e é seguro com vários workers):
//  * lê eventos REAIS da base de dados (contactos, mensagens do cliente, qualificações, pagamentos) a partir do
//    cursor da automação: só reage ao que acontece depois de ser ativada;
//  * o varrimento de cada automação faz-se numa transação com o registo da automação bloqueado (FOR UPDATE SKIP
//    LOCKED): dois workers nunca varrem a mesma ao mesmo tempo;
//  * cada evento só cria UMA execução (restrição única automação+evento) e a mesma automação só corre uma vez por
//    contacto em 24 h: palavras-chave repetidas ou varrimentos repetidos não repetem a ação;
//  * as ações de uma execução correm por ordem e cada uma é reivindicada com FOR UPDATE SKIP LOCKED;
//  * nunca há ciclos: as ações só criam mensagens de saída, tarefas e mudam a fase, e os gatilhos só olham para
//    mensagens de ENTRADA, contactos novos, qualificações e pagamentos;
//  * mensagens passam por enqueueText (paywall, janela de 24 h, canal ligado, ritmo) e nunca chegam a quem pediu
//    para parar nem a conversas em que um humano assumiu; um passo "a meio" de um worker morto nunca se repete.

const SCAN_LIMIT = 200; // eventos por automação por varrimento
const OVERLAP_MS = 60_000; // reler 1 min para trás: transações que confirmaram tarde. A chave única evita repetir
const SETTLE_MS = 5_000; // não ler eventos dos últimos 5 s (ainda podem estar a ser gravados)
const STALE_AFTER_MS = 10 * 60 * 1000;
const STEPS_PER_RUN = () => Number(process.env.AUTOMATION_MAX_STEPS_PER_RUN) || 100;
const DAILY_MESSAGE_CAP = () => Number(process.env.AUTOMATION_DAILY_CAP) || 500;

interface DomainEvent {
  contactId: string;
  key: string;
  at: Date;
}

async function fetchEvents(automation: Automation, from: Date, to: Date): Promise<DomainEvent[]> {
  const where = { workspaceId: automation.workspaceId };
  const range = { gt: from, lte: to };

  switch (automation.trigger) {
    case "NEW_CONTACT": {
      const rows = await prisma.contact.findMany({ where: { ...where, createdAt: range }, orderBy: { createdAt: "asc" }, take: SCAN_LIMIT, select: { id: true, createdAt: true } });
      return rows.map((row) => ({ contactId: row.id, key: `contact:${row.id}`, at: row.createdAt }));
    }
    case "MESSAGE_RECEIVED": {
      const { keyword } = parseTriggerConfig(automation.config);
      const rows = await prisma.message.findMany({
        where: { ...where, direction: "IN", createdAt: range },
        orderBy: { createdAt: "asc" },
        take: SCAN_LIMIT,
        select: { id: true, body: true, createdAt: true, conversation: { select: { contactId: true } } },
      });
      return rows.filter((row) => matchesKeyword(row.body, keyword)).map((row) => ({ contactId: row.conversation.contactId, key: `msg:${row.id}`, at: row.createdAt }));
    }
    case "LEAD_QUALIFIED": {
      const rows = await prisma.contact.findMany({ where: { ...where, leadStage: "QUALIFIED", qualifiedAt: range }, orderBy: { qualifiedAt: "asc" }, take: SCAN_LIMIT, select: { id: true, qualifiedAt: true } });
      return rows.flatMap((row) => (row.qualifiedAt ? [{ contactId: row.id, key: `qualified:${row.id}:${row.qualifiedAt.getTime()}`, at: row.qualifiedAt }] : []));
    }
    case "POPUP_SUBMITTED": {
      const rows = await prisma.popupSubmission.findMany({ where: { ...where, createdAt: range }, orderBy: { createdAt: "asc" }, take: SCAN_LIMIT, select: { id: true, contactId: true, createdAt: true } });
      return rows.map((row) => ({ contactId: row.contactId, key: `popup:${row.id}`, at: row.createdAt }));
    }
    case "PAYMENT_PAID": {
      const rows = await prisma.paymentLink.findMany({ where: { ...where, status: "PAID", contactId: { not: null }, paidAt: range }, orderBy: { paidAt: "asc" }, take: SCAN_LIMIT, select: { id: true, contactId: true, paidAt: true } });
      return rows.flatMap((row) => (row.contactId && row.paidAt ? [{ contactId: row.contactId, key: `paid:${row.id}`, at: row.paidAt }] : []));
    }
  }
}

// Varre UMA automação ativa: cria as execuções dos eventos novos e avança o cursor. Devolve quantas criou.
export async function scanAutomation(automationId: string): Promise<number> {
  return prisma.$transaction(
    async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Automation" WHERE "id" = ${automationId} AND "active" = true FOR UPDATE SKIP LOCKED`;
      if (locked.length === 0) return 0;
      const automation = await tx.automation.findUnique({ where: { id: automationId } });
      if (!automation) return 0;

      const upTo = new Date(Date.now() - SETTLE_MS);
      const from = new Date(automation.cursorAt.getTime() - OVERLAP_MS);
      const events = await fetchEvents(automation, from, upTo);
      const actions = parseActions(automation.actions);
      let created = 0;

      if (actions.length > 0) {
        for (const event of events) {
          // O overlap relê 1 min para trás, mas nunca antes de a automação ser ativada (`activatedAt`).
          if (event.at < automation.activatedAt) continue;
          const last = await tx.automationRun.findFirst({ where: { automationId, contactId: event.contactId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
          if (inCooldown(last?.createdAt ?? null, new Date())) continue;
          const startedAt = new Date();
          try {
            await tx.automationRun.create({
              data: {
                automationId,
                workspaceId: automation.workspaceId,
                contactId: event.contactId,
                eventKey: event.key,
                steps: { create: scheduleSteps(actions, startedAt).map((step) => ({ workspaceId: automation.workspaceId, index: step.index, type: step.action.type, config: step.action, dueAt: step.dueAt })) },
              },
            });
            created++;
          } catch (err) {
            // Evento já tratado (chave única): normal com o overlap.
            if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
          }
        }
      }

      // Lote cheio: ainda há eventos antes de `upTo`, o cursor só anda até ao último lido. Senão, até `upTo`.
      const next = events.length >= SCAN_LIMIT ? events[events.length - 1].at : upTo;
      if (next > automation.cursorAt) await tx.automation.update({ where: { id: automationId }, data: { cursorAt: next } });
      return created;
    },
    { timeout: 30_000, maxWait: 5_000 },
  );
}

// ------------------------------------------------------------------------------------------------ ações
interface ClaimedStep {
  id: string;
  runId: string;
  workspaceId: string;
  index: number;
  type: string;
  config: unknown;
}

async function claimSteps(limit: number): Promise<ClaimedStep[]> {
  return prisma.$queryRaw<ClaimedStep[]>`
    WITH picked AS (
      SELECT s."id" FROM "AutomationRunStep" s
      WHERE s."status" = 'PENDING' AND s."dueAt" <= timezone('utc', now())
        AND NOT EXISTS (
          SELECT 1 FROM "AutomationRunStep" p
          WHERE p."runId" = s."runId" AND p."index" < s."index" AND p."status" IN ('PENDING', 'PROCESSING')
        )
      ORDER BY s."dueAt" ASC
      LIMIT ${limit}::int
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "AutomationRunStep" AS s
    SET "status" = 'PROCESSING', "updatedAt" = timezone('utc', now())
    FROM picked
    WHERE s."id" = picked."id"
    RETURNING s."id", s."runId", s."workspaceId", s."index", s."type", s."config"
  `;
}

type Outcome = { status: "DONE" | "SKIPPED" | "FAILED"; reason?: string };

const STAGE_INTENT = { ENGAGED: "interested", QUALIFIED: "ready_to_buy", LOST: "not_interested" } as const;
const SKIP_ERRORS: Record<string, string> = { window_closed: "window_closed", no_integration: "no_integration", not_found: "no_conversation" };

async function execute(step: ClaimedStep): Promise<Outcome> {
  const run = await prisma.automationRun.findUnique({ where: { id: step.runId }, select: { contactId: true, automation: { select: { active: true, name: true } } } });
  if (!run) return { status: "SKIPPED", reason: "run_gone" };
  if (!run.automation.active) return { status: "SKIPPED", reason: "automation_inactive" };

  // Se uma ação anterior falhou, as seguintes não correm (a sequência perdeu o sentido).
  const earlier = await prisma.automationRunStep.count({ where: { runId: step.runId, index: { lt: step.index }, status: "FAILED" } });
  if (earlier > 0) return { status: "SKIPPED", reason: "previous_failed" };

  const parsed = actionSchema.safeParse(step.config);
  if (!parsed.success) return { status: "FAILED", reason: "invalid_config" };
  const action: ActionConfig = parsed.data;

  const contact = await prisma.contact.findFirst({ where: { id: run.contactId, workspaceId: step.workspaceId }, select: { name: true, optedOutAt: true, leadStage: true } });
  if (!contact) return { status: "SKIPPED", reason: "no_contact" };

  if (action.type === "SEND_MESSAGE") {
    if (contact.optedOutAt) return { status: "SKIPPED", reason: "opted_out" };
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const sentToday = await prisma.automationRunStep.count({ where: { workspaceId: step.workspaceId, type: "SEND_MESSAGE", status: "DONE", doneAt: { gte: startOfDay } } });
    if (sentToday >= DAILY_MESSAGE_CAP()) return { status: "SKIPPED", reason: "daily_cap" };
    const conversation = await prisma.conversation.findFirst({ where: { contactId: run.contactId, workspaceId: step.workspaceId }, orderBy: { lastMessageAt: "desc" }, select: { id: true, isPaused: true } });
    if (!conversation) return { status: "SKIPPED", reason: "no_conversation" };
    if (conversation.isPaused) return { status: "SKIPPED", reason: "human_took_over" };
    const result = await enqueueText({ workspaceId: step.workspaceId, conversationId: conversation.id, text: renderText(action.text, contact.name) });
    if (result.ok) return { status: "DONE" };
    if (result.error === "subscription_required") return { status: "FAILED", reason: "subscription_required" };
    return { status: "SKIPPED", reason: SKIP_ERRORS[result.error] ?? "invalid" };
  }

  if (action.type === "SET_STAGE") {
    const result = await applyLeadUpdate({ workspaceId: step.workspaceId, contactId: run.contactId, update: { intent: STAGE_INTENT[action.stage], rejected: [] } });
    if (!result) return { status: "SKIPPED", reason: "no_contact" };
    return result.stage === contact.leadStage ? { status: "SKIPPED", reason: "no_change" } : { status: "DONE" };
  }

  // CREATE_TASK
  if ((await prisma.task.count({ where: { workspaceId: step.workspaceId } })) >= MAX_TASKS) return { status: "SKIPPED", reason: "too_many_tasks" };
  const position = await prisma.task.count({ where: { workspaceId: step.workspaceId, status: "TODO" } });
  await prisma.task.create({
    data: { workspaceId: step.workspaceId, title: renderText(action.title, contact.name).slice(0, 140) || "Seguir contacto", description: `Criada pela automação «${run.automation.name}».`, status: "TODO", priority: "MEDIUM", position },
  });
  return { status: "DONE" };
}

// A ação seguinte da MESMA execução, se já for devida: corre logo a seguir (sem esperar pelo próximo cron). Só
// existe uma por vez e só depois de a anterior terminar, por isso a ordem mantém-se.
async function claimNext(runId: string, afterIndex: number): Promise<ClaimedStep | null> {
  const next = await prisma.automationRunStep.findFirst({
    where: { runId, index: { gt: afterIndex }, status: "PENDING", dueAt: { lte: new Date() } },
    orderBy: { index: "asc" },
    select: { id: true, runId: true, workspaceId: true, index: true, type: true, config: true },
  });
  if (!next) return null;
  const claimed = await prisma.automationRunStep.updateMany({ where: { id: next.id, status: "PENDING" }, data: { status: "PROCESSING" } });
  return claimed.count === 1 ? next : null;
}

async function runStep(step: ClaimedStep) {
  let outcome: Outcome;
  try {
    outcome = await execute(step);
  } catch (err) {
    // Erro nosso (base de dados...). Não se repete: pode já ter feito parte do trabalho (ex.: enfileirado).
    console.error("[automations] falha ao executar um passo", step.id, err);
    outcome = { status: "FAILED", reason: "internal" };
  }
  await prisma.automationRunStep.update({ where: { id: step.id }, data: { status: outcome.status, reason: outcome.reason ?? null, doneAt: new Date() } });
  const open = await prisma.automationRunStep.count({ where: { runId: step.runId, status: { in: ["PENDING", "PROCESSING"] } } });
  if (open === 0) await prisma.automationRun.updateMany({ where: { id: step.runId, completedAt: null }, data: { completedAt: new Date() } });
}

export interface AutomationRunSummary {
  scanned: number;
  runsCreated: number;
  stepsRun: number;
  stale: number;
}

export async function runAutomations(options: { deadlineAt?: number } = {}): Promise<AutomationRunSummary> {
  const summary: AutomationRunSummary = { scanned: 0, runsCreated: 0, stepsRun: 0, stale: 0 };

  const stale = await prisma.automationRunStep.updateMany({ where: { status: "PROCESSING", updatedAt: { lt: new Date(Date.now() - STALE_AFTER_MS) } }, data: { status: "FAILED", reason: "worker_interrupted", doneAt: new Date() } });
  summary.stale = stale.count;

  const active = await prisma.automation.findMany({ where: { active: true, workspace: { blockedAt: null, subStatus: { in: ["active", "trialing"] } } }, orderBy: { updatedAt: "asc" }, take: 100, select: { id: true } });
  for (const automation of active) {
    if (options.deadlineAt !== undefined && Date.now() >= options.deadlineAt) break;
    try {
      summary.runsCreated += await scanAutomation(automation.id);
      summary.scanned++;
    } catch (err) {
      console.error("[automations] falha ao varrer", automation.id, err);
    }
  }

  const steps = await claimSteps(STEPS_PER_RUN());
  for (const [index, step] of steps.entries()) {
    if (options.deadlineAt !== undefined && Date.now() >= options.deadlineAt) {
      await prisma.automationRunStep.updateMany({ where: { id: { in: steps.slice(index).map((s) => s.id) }, status: "PROCESSING" }, data: { status: "PENDING" } });
      break;
    }
    let current: ClaimedStep | null = step;
    while (current) {
      await runStep(current);
      summary.stepsRun++;
      current = options.deadlineAt !== undefined && Date.now() >= options.deadlineAt ? null : await claimNext(current.runId, current.index);
    }
  }
  return summary;
}

// ------------------------------------------------------------------------------------------------ leitura
export interface AutomationStats {
  runs: number;
  messages: number;
  failed: number;
}

export async function automationStats(workspaceId: string, ids: string[]): Promise<Record<string, AutomationStats>> {
  if (ids.length === 0) return {};
  const since = new Date(Date.now() - 7 * 86_400_000);
  const rows = await prisma.$queryRaw<{ automationId: string; runs: number; messages: number; failed: number }[]>(Prisma.sql`
    SELECT r."automationId" AS "automationId",
           count(DISTINCT r."id")::int AS runs,
           count(s."id") FILTER (WHERE s."type" = 'SEND_MESSAGE' AND s."status" = 'DONE')::int AS messages,
           count(s."id") FILTER (WHERE s."status" = 'FAILED')::int AS failed
    FROM "AutomationRun" r LEFT JOIN "AutomationRunStep" s ON s."runId" = r."id"
    WHERE r."workspaceId" = ${workspaceId} AND r."automationId" IN (${Prisma.join(ids)}) AND r."createdAt" >= ${since}
    GROUP BY r."automationId"`);
  return Object.fromEntries(rows.map((row) => [row.automationId, { runs: row.runs, messages: row.messages, failed: row.failed }]));
}
