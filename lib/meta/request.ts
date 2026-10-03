// Puro (sem servidor): como se pede à Graph API que envie um texto, em cada plataforma. Os três produtos
// vivem na mesma Graph API mas diferem no caminho, no corpo e no sítio onde vem o id da mensagem enviada.
import type { PlatformName } from "@/lib/outbox/split-text";

export interface MetaAccount {
  accountId: string; // phone_number_id | id da página | id da conta Instagram
  pageId?: string | null; // Instagram: página ligada, usada para enviar
}

export interface MetaTextRequest {
  path: string; // relativo à Graph API: "<id>/messages"
  body: Record<string, unknown>;
  // De onde sair o id da mensagem enviada na resposta (para os recibos de entrega a encontrarem).
  externalId: (data: unknown) => string | null;
}

const str = (value: unknown) => (typeof value === "string" && value ? value : null);

export function buildTextRequest(platform: PlatformName, account: MetaAccount, to: string, text: string): MetaTextRequest {
  switch (platform) {
    case "WHATSAPP":
      return {
        path: `${account.accountId}/messages`,
        body: { messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body: text } },
        externalId: (data) => str((data as { messages?: { id?: unknown }[] })?.messages?.[0]?.id),
      };
    case "MESSENGER":
      // "RESPONSE": resposta dentro da janela de 24 h após a mensagem do cliente.
      return {
        path: `${account.accountId}/messages`,
        body: { messaging_type: "RESPONSE", recipient: { id: to }, message: { text } },
        externalId: (data) => str((data as { message_id?: unknown })?.message_id),
      };
    case "INSTAGRAM":
      return {
        path: `${account.pageId || account.accountId}/messages`,
        body: { recipient: { id: to }, message: { text } },
        externalId: (data) => str((data as { message_id?: unknown })?.message_id),
      };
  }
}
