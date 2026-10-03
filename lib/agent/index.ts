import "server-only";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import {
  sendAudioInConversation,
  sendTextInConversation,
} from "@/lib/whatsapp/cloud";
import { chaveOk, gerarResposta } from "./cerebro";
import { synthesizeSpeech, voiceWanted } from "./voice";
import { loadTenant } from "@/lib/tenant";

// Ponto de entrada do agente. É chamado pelo webhook DEPOIS de a mensagem estar gravada
// e de a Meta já ter recebido o 200, por isso nunca pode lançar erros: falhas só são registadas.

export interface AgentEvent {
  workspaceId: string;
  conversationId: string;
  waMessageId: string;
  type: string;
  // Nota de voz que não se conseguiu ouvir/transcrever: o agente pede ao cliente que escreva.
  unintelligible?: boolean;
}

const UNINTELLIGIBLE_REPLY =
  "Não consegui ouvir bem a sua mensagem de voz. Pode escrever-me, por favor? 🙂";

// Quando TODOS os modelos falham, calar-se deixa o cliente sem resposta e sem saber porquê.
// A equipa vê a mensagem na Inbox; o cliente recebe isto (no máximo uma vez por meia hora).
const MODEL_DOWN_REPLY =
  "Obrigado pela sua mensagem! Vou pedir a um colega da equipa para lhe responder em breve. 🙂";
const MODEL_DOWN_NOTICE_WINDOW_MS = 30 * 60 * 1000;

const MAX_REPLIES_PER_HOUR = 20; // trava de custo/ciclos, por conversa
let avisouSemChave = false;

export const agentEnabled = () => process.env.AGENT_ENABLED === "true";

export async function runAgentSafely(events: AgentEvent[]) {
  if (!agentEnabled() || events.length === 0) return;
  for (const event of events) {
    try {
      await handle(event);
    } catch (err) {
      console.error(
        "[agent] failed",
        event.conversationId,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

// Existe uma mensagem do cliente mais recente do que esta? (createdAt tem precisão de segundos,
// por isso o id desempata mensagens do mesmo segundo.)
async function hasNewerInbound(
  conversationId: string,
  mine: { id: string; createdAt: Date },
) {
  const newer = await prisma.message.findFirst({
    where: {
      conversationId,
      direction: "IN",
      OR: [
        { createdAt: { gt: mine.createdAt } },
        { createdAt: mine.createdAt, id: { gt: mine.id } },
      ],
    },
    select: { id: true },
  });
  return newer !== null;
}

// A human took over this conversation. If the lookup itself fails the error propagates and the
// agent stays silent: it must never talk over a person because a check did not work.
async function isPaused(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { isPaused: true },
  });
  return conversation?.isPaused === true;
}

async function handle(event: AgentEvent) {
  if (event.type !== "text" && event.type !== "audio") return; // texto e notas de voz (já transcritas)

  // A organização a quem pertence esta conversa decide TUDO o que é específico do cliente: se o agente
  // está ligado, se a subscrição está em dia e qual é a ficha do negócio. AGENT_ENABLED continua a ser
  // o interruptor geral do servidor; isto é o interruptor de cada cliente.
  const tenant = await loadTenant(event.workspaceId);
  if (!tenant || !tenant.agentEnabled || !tenant.subscriptionActive) return;
  if (!tenant.knowledge) {
    // Sem ficha, o agente inventaria: melhor calar-se. Avisa-se no máximo uma vez por dia por organização
    // (o contador vive na base de dados: em serverless a memória de uma instância não é de todas).
    const aviso = await rateLimit(`agent-no-profile:${tenant.workspaceId}`, {
      limit: 1,
      windowMs: 24 * 60 * 60 * 1000,
    });
    if (aviso.ok) {
      console.warn(
        `[agent] a organização "${tenant.name}" tem o agente ligado mas ainda não tem ficha do negócio; não responde`,
      );
    }
    return;
  }
  const contexto = {
    workspaceId: tenant.workspaceId,
    conhecimento: tenant.knowledge,
  };

  // O humano assumiu esta conversa: a mensagem já ficou gravada, o agente nem chega ao modelo.
  if (await isPaused(event.conversationId)) return;

  if (!chaveOk()) {
    if (!avisouSemChave) {
      avisouSemChave = true;
      console.warn(
        "[agent] AGENT_ENABLED=true mas OPENROUTER_API_KEY não está definida; o agente não responde",
      );
    }
    return;
  }

  const mine = await prisma.message.findUnique({
    where: { waMessageId: event.waMessageId },
    select: {
      id: true,
      createdAt: true,
      conversation: { select: { contact: { select: { waId: true } } } },
    },
  });
  if (!mine) return;

  // Chegou outra mensagem do cliente entretanto: a execução dessa é que responde, com o contexto todo.
  if (await hasNewerInbound(event.conversationId, mine)) return;

  const limit = await rateLimit(`agent:${event.conversationId}`, {
    limit: MAX_REPLIES_PER_HOUR,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.ok) {
    console.warn(
      "[agent] limite de respostas por hora atingido",
      event.conversationId,
    );
    return;
  }

  let reply: string;
  let fixedReply = false; // respostas fixas nunca vão em voz
  if (event.unintelligible) {
    fixedReply = true;
    // Sem transcrição não há nada para o modelo ler: resposta fixa, sem gastar uma chamada.
    reply = UNINTELLIGIBLE_REPLY;
  } else {
    const rows = await prisma.message.findMany({
      where: { conversationId: event.conversationId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { direction: true, type: true, body: true, createdAt: true },
    });
    const historico = rows.reverse().map((r) => ({
      direction: r.direction === "OUT" ? ("OUT" as const) : ("IN" as const),
      type: r.type,
      body: r.body,
      createdAt: r.createdAt,
    }));

    try {
      reply = await gerarResposta(
        historico,
        mine.conversation.contact.waId,
        contexto,
      );
    } catch (err) {
      console.error(
        "[agent] todos os modelos falharam:",
        err instanceof Error ? err.message : err,
      );
      const notice = await rateLimit(`agent-down:${event.conversationId}`, {
        limit: 1,
        windowMs: MODEL_DOWN_NOTICE_WINDOW_MS,
      });
      if (!notice.ok) return; // já avisámos este cliente há pouco
      reply = MODEL_DOWN_REPLY;
      fixedReply = true;
    }
  }
  if (!reply) return;

  // Voz (desligada por defeito): converter em áudio é outro passo lento, por isso faz-se ANTES das
  // verificações abaixo, que têm de correr o mais perto possível do envio. Se falhar: texto.
  // Só em voz se o cliente falou (modo espelho) e se a resposta é normal: o pedido "escreva-me"
  // seria absurdo dito em voz alta.
  const speech =
    voiceWanted(event.type) && !fixedReply
      ? await synthesizeSpeech(reply)
      : null;

  // O modelo demora segundos: se um humano pausou a IA entretanto, a resposta é descartada.
  if (await isPaused(event.conversationId)) return;

  // O modelo demora: se o cliente escreveu outra vez enquanto isto corria, esta resposta já está
  // desatualizada e é descartada (a execução da mensagem mais nova trata dela).
  if (await hasNewerInbound(event.conversationId, mine)) return;

  if (speech) {
    const audio = await sendAudioInConversation({
      workspaceId: event.workspaceId,
      conversationId: event.conversationId,
      audio: speech,
      transcript: reply,
    });
    if (audio.ok) return;
    // Nada foi entregue: o cliente recebe a resposta por texto em vez de a perder.
    console.error(
      "[agent] envio de áudio falhou, a responder por texto:",
      audio.error,
      event.conversationId,
    );
  }

  const sent = await sendTextInConversation({
    workspaceId: event.workspaceId,
    conversationId: event.conversationId,
    text: reply,
  });
  if (!sent.ok)
    console.error("[agent] envio falhou:", sent.error, event.conversationId);
}
