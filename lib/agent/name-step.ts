import "server-only";
import { decideNameStep, extractName, findOriginalRequest, NAME_ASK_TEXT, NAME_RETRY_TEXT, nameAckText } from "@/lib/leads/name-capture";
import { visibleName } from "@/lib/inbox/display";
import { firstName } from "@/lib/campaigns/schema";
import { prisma } from "@/lib/prisma";
import { drainOutbox } from "@/lib/outbox/process";
import { sendTextInConversation } from "@/lib/whatsapp/cloud";

// Prioridade à recolha do nome. A um contacto SEM nome, a primeira (e única) resposta é a saudação a pedir o nome;
// o agente NÃO responde à dúvida inicial. Se a resposta seguinte não for um nome, repete-se o pedido uma vez. Quando
// chega o nome, guarda-se, saúda-se («Prazer, João!») e SÓ ENTÃO se responde ao pedido original (o agente corre a seguir,
// com o histórico sem a troca do nome). Desliga-se com AGENT_ASK_NAME=false.
export const askNameEnabled = () => process.env.AGENT_ASK_NAME !== "false";

export type NameStepResult =
  | { kind: "none" } // não é caso de nome: o agente segue o seu caminho normal
  | { kind: "handled" } // pediu-se (ou repetiu-se) o nome: o agente não corre
  | { kind: "captured"; ack: string; pendingRequest: string | null }; // nome guardado; se há pedido pendente, o agente responde-lhe

export async function handleNameStep(input: {
  workspaceId: string;
  conversationId: string;
  contactId: string;
  inboundText: string | null;
}): Promise<NameStepResult> {
  if (!askNameEnabled()) return { kind: "none" };
  const { workspaceId, conversationId, contactId } = input;

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId },
    select: { platform: true, contact: { select: { name: true } } },
  });
  if (!conversation || conversation.platform !== "WHATSAPP") return { kind: "none" }; // Instagram/Messenger: sem este fluxo

  const [lastOutgoing, asks] = await Promise.all([
    prisma.message.findFirst({ where: { conversationId, direction: "OUT" }, orderBy: { createdAt: "desc" }, select: { body: true } }),
    prisma.message.count({ where: { conversationId, direction: "OUT", body: { in: [NAME_ASK_TEXT, NAME_RETRY_TEXT] } } }),
  ]);
  const step = decideNameStep({
    contactHasName: visibleName(conversation.contact.name) !== null,
    asks,
    lastOutgoingIsAsk: lastOutgoing?.body === NAME_ASK_TEXT || lastOutgoing?.body === NAME_RETRY_TEXT,
    inboundText: input.inboundText,
  });
  if (step === "skip") return { kind: "none" };

  if (step === "ask" || step === "retry") {
    const sent = await sendTextInConversation({ workspaceId, conversationId, text: step === "ask" ? NAME_ASK_TEXT : NAME_RETRY_TEXT });
    if (sent.ok) await drainOutbox();
    // Se não saiu (plano, canal), o agente segue o seu caminho normal em vez de calar o cliente.
    return sent.ok ? { kind: "handled" } : { kind: "none" };
  }

  const name = extractName(input.inboundText);
  if (!name) return { kind: "none" };
  await prisma.contact.updateMany({ where: { id: contactId, workspaceId }, data: { name } });

  // O pedido que o cliente tinha feito antes de lhe pedirmos o nome.
  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 40,
    select: { direction: true, body: true },
  });
  const pendingRequest = findOriginalRequest(history.map((m) => ({ direction: m.direction === "OUT" ? ("OUT" as const) : ("IN" as const), body: m.body })));

  const ack = nameAckText(firstName(name) || name, pendingRequest !== null);
  const sent = await sendTextInConversation({ workspaceId, conversationId, text: ack });
  if (sent.ok) await drainOutbox();
  return { kind: "captured", ack, pendingRequest };
}
