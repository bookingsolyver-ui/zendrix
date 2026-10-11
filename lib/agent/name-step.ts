import "server-only";
import { decideNameStep, extractName, NAME_ASK_TEXT, nameAckText } from "@/lib/leads/name-capture";
import { visibleName } from "@/lib/inbox/display";
import { firstName } from "@/lib/campaigns/schema";
import { prisma } from "@/lib/prisma";
import { drainOutbox } from "@/lib/outbox/process";
import { sendTextInConversation } from "@/lib/whatsapp/cloud";

// Captura do nome no início da conversa: a um número sem nome, a primeira resposta pergunta-o; a resposta seguinte,
// se for mesmo um nome, fica guardada no contacto (e a Inbox, a lista de contactos e as campanhas passam a usá-lo).
// Devolve true quando tratou a mensagem (o agente não corre). Desliga-se com AGENT_ASK_NAME=false.
export const askNameEnabled = () => process.env.AGENT_ASK_NAME !== "false";

export async function handleNameStep(input: {
  workspaceId: string;
  conversationId: string;
  contactId: string;
  inboundText: string | null;
}): Promise<boolean> {
  if (!askNameEnabled()) return false;
  const { workspaceId, conversationId, contactId } = input;

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId },
    select: { platform: true, contact: { select: { name: true } } },
  });
  if (!conversation || conversation.platform !== "WHATSAPP") return false; // Instagram/Messenger: sem este fluxo

  const [outgoing, asked] = await Promise.all([
    prisma.message.findMany({ where: { conversationId, direction: "OUT" }, orderBy: { createdAt: "desc" }, take: 1, select: { body: true } }),
    prisma.message.count({ where: { conversationId, direction: "OUT", body: NAME_ASK_TEXT } }),
  ]);
  const step = decideNameStep({
    contactHasName: visibleName(conversation.contact.name) !== null,
    hasOutgoing: outgoing.length > 0,
    askedBefore: asked > 0,
    lastOutgoingIsAsk: outgoing[0]?.body === NAME_ASK_TEXT,
    inboundText: input.inboundText,
  });
  if (step === "skip") return false;

  if (step === "ask") {
    const sent = await sendTextInConversation({ workspaceId, conversationId, text: NAME_ASK_TEXT });
    if (sent.ok) await drainOutbox();
    return sent.ok; // se não saiu (plano, canal), o agente segue o seu caminho normal
  }

  const name = extractName(input.inboundText);
  if (!name) return false;
  await prisma.contact.updateMany({ where: { id: contactId, workspaceId }, data: { name } });
  const sent = await sendTextInConversation({ workspaceId, conversationId, text: nameAckText(firstName(name) || name) });
  if (sent.ok) await drainOutbox();
  return true;
}
