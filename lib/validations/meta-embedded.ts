import { z } from "zod";

// WhatsApp Embedded Signup. Puro (sem servidor): serve ao navegador (a mensagem que o popup da Meta envia) e
// ao servidor (o pedido que o browser nos faz).

// Os ids da Meta são números em texto.
const metaId = z.string().regex(/^\d{5,30}$/);

// A mensagem que o popup do Embedded Signup envia à nossa janela (window.postMessage). Só interessa o fim do
// fluxo: traz o id da conta WhatsApp Business (WABA) e o do número.
export const embeddedSessionSchema = z.object({
  type: z.literal("WA_EMBEDDED_SIGNUP"),
  event: z.enum(["FINISH", "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"]),
  data: z.object({ phone_number_id: metaId, waba_id: metaId }),
});

// O que o nosso browser envia ao servidor: o `code` do FB.login e os ids do popup.
export const embeddedSignupRequestSchema = z.strictObject({
  code: z.string().min(1).max(2048),
  wabaId: metaId,
  phoneNumberId: metaId,
});

// Devolve os ids se `data` é a mensagem de fim do fluxo, senão null. Nunca lança.
export function parseEmbeddedSession(data: unknown): { wabaId: string; phoneNumberId: string } | null {
  // O popup envia o objeto em JSON (texto) ou já como objeto, conforme a versão do SDK.
  let value = data;
  if (typeof data === "string") {
    try {
      value = JSON.parse(data);
    } catch {
      return null;
    }
  }
  const parsed = embeddedSessionSchema.safeParse(value);
  return parsed.success ? { wabaId: parsed.data.data.waba_id, phoneNumberId: parsed.data.data.phone_number_id } : null;
}

// Só aceitamos mensagens vindas do Facebook.
export const isFacebookOrigin = (origin: string) => {
  try {
    const host = new URL(origin).hostname;
    return host === "facebook.com" || host.endsWith(".facebook.com");
  } catch {
    return false;
  }
};
