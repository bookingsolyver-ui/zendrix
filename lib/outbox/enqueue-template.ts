import "server-only";
import { getAccess } from "@/lib/billing/access";
import { prisma } from "@/lib/prisma";
import { activeWhatsAppKind } from "@/lib/whatsapp/channel-kind";
import type { EnqueueError } from "@/lib/outbox/enqueue";
import { hasNamePlaceholder, renderMessage } from "@/lib/campaigns/schema";
import { checkParams, renderTemplate } from "@/lib/templates/meta-payload";
import type { OutboxPayload } from "@/lib/validations/outbox";

export type EnqueueTemplateError = EnqueueError | "template_not_found" | "template_not_approved" | "template_unsupported" | "invalid_params" | "unsupported_platform";

export type EnqueueTemplateResult =
  | { ok: true; message: { id: string; type: string; body: string; status: string; createdAt: Date } }
  | { ok: false; error: EnqueueTemplateError };

// Como enqueueText, mas para um modelo: na API oficial tem de estar APROVADO pela Meta e não exige a janela de 24 h;
// no QR Code (OpenWA) sai como texto preenchido, sem janela.
// Grava a Message (QUEUED, com o texto já preenchido, para a equipa ver o que saiu) e a OutboxMessage na mesma transação.
export async function enqueueTemplate(input: {
  workspaceId: string;
  conversationId: string;
  templateId: string;
  params: string[];
}): Promise<EnqueueTemplateResult> {
  const { workspaceId, conversationId, templateId } = input;
  if (!(await getAccess(workspaceId)).active) return { ok: false, error: "subscription_required" };

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId },
    select: { platform: true, contact: { select: { waId: true, name: true } } },
  });
  if (!conversation) return { ok: false, error: "not_found" };
  if (conversation.platform !== "WHATSAPP") return { ok: false, error: "unsupported_platform" };

  const template = await prisma.messageTemplate.findFirst({ where: { id: templateId, workspaceId } });
  if (!template) return { ok: false, error: "template_not_found" };

  // O canal ativo decide: a API oficial exige um modelo APROVADO pela Meta; o QR Code (OpenWA) não tem esse conceito,
  // por isso qualquer modelo da organização serve e sai como texto já preenchido.
  const kind = await activeWhatsAppKind(workspaceId);
  if (!kind) return { ok: false, error: "no_integration" };
  if (kind === "meta") {
    if (template.metaStatus !== "APPROVED") return { ok: false, error: "template_not_approved" };
    if (!template.sendable) return { ok: false, error: "template_unsupported" };
  }
  const params = checkParams(template.body, input.params);
  if (!params) return { ok: false, error: "invalid_params" };

  let text = renderTemplate(template.body, params);
  // No canal QR o modelo sai como texto: {{nome}} & co. recebem o nome do contacto.
  if (kind === "qr" && hasNamePlaceholder(text)) text = renderMessage(text, conversation.contact.name);
  const createdAt = new Date();
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: { workspaceId, conversationId, platform: "WHATSAPP", direction: "OUT", type: "template", body: text, status: "QUEUED", createdAt },
      select: { id: true, type: true, body: true, status: true, createdAt: true },
    });
    const payload: OutboxPayload =
      kind === "qr"
        ? { kind: "text", to: conversation.contact.waId, text, conversationId, messageId: created.id }
        : {
            kind: "template",
            to: conversation.contact.waId,
            templateName: template.name,
            language: template.language,
            params,
            conversationId,
            messageId: created.id,
          };
    await tx.outboxMessage.create({ data: { workspaceId, platform: "WHATSAPP", payload, createdAt } });
    await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: createdAt, lastMessagePreview: `📋 ${text}`.slice(0, 120) } });
    return created;
  });
  return { ok: true, message };
}
