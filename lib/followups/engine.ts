import "server-only";
import { Prisma } from "@prisma/client";
import { chaveOk, gerarSeguimento } from "@/lib/agent/cerebro";
import { agentEnabled } from "@/lib/agent";
import { evaluateAccess } from "@/lib/billing/policy";
import { fallbackFollowUpText, decideFollowUp, parseFollowUpConfig, WINDOW_MS, type FollowUpConfig } from "@/lib/followups/config";
import type { LeadStageName } from "@/lib/leads/lead";
import { enqueueText } from "@/lib/outbox/enqueue";
import { drainOutbox } from "@/lib/outbox/process";
import { prisma } from "@/lib/prisma";

// O motor de seguimentos automáticos (reengajamento). Corre a partir do cron (e é seguro com vários workers):
//
//   * só atua em organizações com a IA ligada, plano ativo e seguimentos ativados;
//   * só em conversas onde a ÚLTIMA mensagem foi nossa e o cliente não respondeu (decideFollowUp);
//   * nunca fora da janela de 24 h da Meta, nunca em horas de silêncio, nunca com a IA pausada, nunca a quem
//     pediu para não receber mais mensagens, nunca a clientes já fechados;
//   * cada seguimento é "reivindicado" com uma linha única (FollowUp): dois workers nunca enviam o mesmo;
//   * o envio passa pela fila de saída (ritmo controlado, tentativas), como qualquer outra resposta.

const MAX_PER_RUN = () => Number(process.env.FOLLOWUP_MAX_PER_RUN) || 15;
const MAX_PER_WORKSPACE_PER_RUN = 10;
const DAILY_CAP = () => Number(process.env.FOLLOWUP_DAILY_CAP) || 200;
const CANDIDATES_PER_WORKSPACE = 40;
const HISTORY = 12;

export interface FollowUpRunSummary {
  skippedRun?: "agent_off";
  workspaces: number;
  considered: number;
  sent: number;
  skipped: Record<string, number>;
}

const bump = (summary: FollowUpRunSummary, reason: string) => {
  summary.skipped[reason] = (summary.skipped[reason] ?? 0) + 1;
};

export async function runFollowUps(options: { deadlineAt?: number } = {}): Promise<FollowUpRunSummary> {
  const summary: FollowUpRunSummary = { workspaces: 0, considered: 0, sent: 0, skipped: {} };
  // O interruptor geral do servidor e a chave do modelo: sem eles a IA não escreve (nem seguimentos).
  if (!agentEnabled() || !chaveOk()) return { ...summary, skippedRun: "agent_off" };

  const now = Date.now();
  const workspaces = await prisma.workspace.findMany({
    where: { agentEnabled: true, blockedAt: null, followUpConfig: { not: Prisma.DbNull }, subStatus: { in: ["trialing", "active"] } },
    select: { id: true, agentKnowledge: true, subStatus: true, trialEndsAt: true, followUpConfig: true },
  });

  let sentThisRun = 0;
  for (const workspace of workspaces) {
    if (sentThisRun >= MAX_PER_RUN() || (options.deadlineAt && Date.now() >= options.deadlineAt)) break;
    const config = parseFollowUpConfig(workspace.followUpConfig);
    if (!config?.enabled || !workspace.agentKnowledge?.trim()) continue;
    if (!evaluateAccess(workspace.subStatus, workspace.trialEndsAt, new Date(now)).active) continue;
    summary.workspaces++;

    const sentToday = await prisma.followUp.count({ where: { workspaceId: workspace.id, status: "QUEUED", createdAt: { gte: new Date(now - 24 * 3600_000) } } });
    let budget = Math.min(MAX_PER_WORKSPACE_PER_RUN, DAILY_CAP() - sentToday);
    if (budget <= 0) {
      bump(summary, "daily_cap");
      continue;
    }

    const minDelayMs = Math.min(...config.steps.map((step) => step.afterMinutes)) * 60_000;
    const candidates = await prisma.conversation.findMany({
      where: {
        workspaceId: workspace.id,
        isPaused: false,
        lastMessageAt: { lt: new Date(now - minDelayMs), gt: new Date(now - WINDOW_MS) },
        contact: { optedOutAt: null, leadStage: { notIn: ["WON", "LOST"] } },
      },
      orderBy: { lastMessageAt: "asc" },
      take: CANDIDATES_PER_WORKSPACE,
      select: { id: true, contact: { select: { leadStage: true, optedOutAt: true } } },
    });

    for (const candidate of candidates) {
      if (budget <= 0 || sentThisRun >= MAX_PER_RUN() || (options.deadlineAt && Date.now() >= options.deadlineAt)) break;
      summary.considered++;
      const outcome = await handleConversation({ workspaceId: workspace.id, conversationId: candidate.id, conhecimento: workspace.agentKnowledge, config, stage: candidate.contact.leadStage as LeadStageName, optedOut: Boolean(candidate.contact.optedOutAt), now });
      if (outcome === "sent") {
        summary.sent++;
        sentThisRun++;
        budget--;
      } else {
        bump(summary, outcome);
      }
    }
  }

  if (summary.sent > 0) await drainOutbox(8_000);
  return summary;
}

async function handleConversation(input: {
  workspaceId: string;
  conversationId: string;
  conhecimento: string;
  config: FollowUpConfig;
  stage: LeadStageName;
  optedOut: boolean;
  now: number;
}): Promise<string> {
  const { workspaceId, conversationId, config, now } = input;

  const rows = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: HISTORY,
    select: { id: true, direction: true, type: true, body: true, createdAt: true, followUpStep: true },
  });
  const lastIn = rows.find((row) => row.direction === "IN");
  const lastOut = rows.find((row) => row.direction === "OUT");
  const sentSinceInbound = lastIn
    ? Math.max(0, ...rows.filter((row) => row.direction === "OUT" && row.createdAt > lastIn.createdAt).map((row) => row.followUpStep ?? 0))
    : 0;

  const decision = decideFollowUp({
    now,
    config,
    lastInboundAt: lastIn?.createdAt.getTime() ?? null,
    lastOutAt: lastOut?.createdAt.getTime() ?? null,
    lastMessageDirection: (rows[0]?.direction as "IN" | "OUT" | undefined) ?? null,
    sentSinceInbound,
    paused: false, // já filtrado na consulta (isPaused: false)
    optedOut: input.optedOut,
    stage: input.stage,
  });
  if (decision.action !== "send" || !lastIn) return decision.action === "send" ? "no_inbound" : decision.reason;

  // Reivindicar: quem consegue criar a linha envia; o outro worker vê o conflito e salta.
  let claimId: string;
  try {
    const claim = await prisma.followUp.create({
      data: { workspaceId, conversationId, anchorInboundId: lastIn.id, step: decision.step, status: "QUEUED" },
      select: { id: true },
    });
    claimId = claim.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return "already_claimed";
    throw err;
  }

  // O texto: o modelo, com o contexto da conversa; se falhar ou não servir, o texto de recurso.
  const historico = [...rows].reverse().map((row) => ({ direction: row.direction === "OUT" ? ("OUT" as const) : ("IN" as const), type: row.type, body: row.body, createdAt: row.createdAt }));
  const generated = await gerarSeguimento({ historico, passo: decision.step, totalPassos: config.steps.length, conhecimento: input.conhecimento });
  const text = generated ?? fallbackFollowUpText(decision.step, config.steps.length);

  const queued = await enqueueText({ workspaceId, conversationId, text, followUpStep: decision.step });
  if (!queued.ok) {
    // window_closed, no_integration, subscription_required...: fica registado e não se repete.
    await prisma.followUp.update({ where: { id: claimId }, data: { status: "SKIPPED", reason: queued.error } });
    return queued.error;
  }
  await prisma.followUp.update({ where: { id: claimId }, data: { messageId: queued.messages[0]?.id ?? null, reason: generated ? "ai" : "fallback" } });
  return "sent";
}
