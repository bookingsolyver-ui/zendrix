import "server-only";
import { getAccess } from "@/lib/billing/access";
import { prisma } from "@/lib/prisma";
import { REPLY_WINDOW_MS } from "@/lib/inbox/types";
import { splitText, TEXT_LIMITS } from "@/lib/outbox/split-text";
import type { OutboxPayload } from "@/lib/validations/outbox";

export type EnqueueError = "not_found" | "window_closed" | "no_integration" | "subscription_required";

export type EnqueueResult =
  | { ok: true; messages: { id: string; type: string; body: string; status: string; createdAt: Date }[] }
  | { ok: false; error: EnqueueError };

// Em vez de falar com a Meta, grava a resposta: uma linha de Message (estado QUEUED, é o que a Inbox
// mostra) e uma de OutboxMessage (PENDING, é o que o worker envia), na MESMA transação. Valida o que
// se pode validar já (conversa, janela de 24 h, canal ligado) para o erro chegar logo a quem pediu;
// o resto (token, limites da Meta) só se sabe ao enviar e fica registado na mensagem.
export async function enqueueText(input: {
  workspaceId: string;
  conversationId: string;
  text: string;
  // Se é um seguimento automático, o passo (1, 2, 3): fica registado na mensagem e conta para a sequência.
  followUpStep?: number;
}): Promise<EnqueueResult> {
  const { workspaceId, conversationId, text, followUpStep } = input;

  // PAYWALL: sem plano ativo (trial acabado, cancelada, em atraso) nada novo sai. É o ponto único por onde
  // passam as respostas da IA, as da Inbox e as das chaves de API.
  if (!(await getAccess(workspaceId)).active) return { ok: false, error: "subscription_required" };

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId },
    select: { platform: true, contact: { select: { waId: true } } },
  });
  if (!conversation) return { ok: false, error: "not_found" };

  const lastInbound = await prisma.message.findFirst({
    where: { conversationId, direction: "IN" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!lastInbound || Date.now() - lastInbound.createdAt.getTime() > REPLY_WINDOW_MS) {
    return { ok: false, error: "window_closed" };
  }

  const integration = await prisma.socialIntegration.findFirst({
    where: { workspaceId, platform: conversation.platform, status: "ACTIVE", providerAccountId: { not: null } },
    select: { id: true },
  });
  if (!integration) return { ok: false, error: "no_integration" };

  // Cada plataforma tem o seu limite de texto: uma resposta longa vai em várias mensagens, por ordem.
  const parts = splitText(text, TEXT_LIMITS[conversation.platform]);
  if (parts.length === 0) return { ok: false, error: "not_found" };

  const start = Date.now();
  const messages = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const [index, part] of parts.entries()) {
      // +index ms: a Inbox e o worker ordenam por createdAt, e as partes têm de manter a ordem.
      const createdAt = new Date(start + index);
      const message = await tx.message.create({
        data: {
          workspaceId,
          conversationId,
          platform: conversation.platform,
          direction: "OUT",
          type: "text",
          body: part,
          status: "QUEUED",
          ...(followUpStep ? { followUpStep } : {}),
          createdAt,
        },
        select: { id: true, type: true, body: true, status: true, createdAt: true },
      });
      const payload: OutboxPayload = {
        kind: "text",
        to: conversation.contact.waId,
        text: part,
        conversationId,
        messageId: message.id,
      };
      await tx.outboxMessage.create({
        data: { workspaceId, platform: conversation.platform, payload, createdAt },
      });
      created.push(message);
    }
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(start), lastMessagePreview: parts[0].slice(0, 120) },
    });
    return created;
  });
  return { ok: true, messages };
}
