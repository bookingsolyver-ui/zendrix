import { NextResponse } from "next/server";
import { z } from "zod";
import { SignedWebhookController } from "@/lib/integrations/signed-webhook";
import { NightwatchService } from "@/lib/nightwatch/service";

export const maxDuration = 60;

// /api/webhooks/whatsapp-nightwatch: dispara a triagem noturna JÁ para uma mensagem recebida (sem esperar pelo varrimento
// de 5 min). Não é o webhook da Meta (a Meta só tem um URL por app, que já existe e grava as mensagens): é um gatilho
// interno assinado com HMAC (NIGHTWATCH_WEBHOOK_SECRET). Corpo: { messageId }.
// A triagem verifica ela própria o horário (20h-08h), o agente, o opt-out e a idempotência.
class NightwatchWebhook extends SignedWebhookController {
  protected readonly label = "webhooks/nightwatch";
  protected readonly secretEnv = "NIGHTWATCH_WEBHOOK_SECRET";

  protected async handleVerified(payload: unknown) {
    const body = z.object({ messageId: z.string().trim().min(1).max(40) }).safeParse(payload);
    if (!body.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    return NextResponse.json({ success: true, result: await NightwatchService.processMessage(body.data.messageId) });
  }
}

export async function POST(request: Request) {
  return new NightwatchWebhook().handle(request);
}
