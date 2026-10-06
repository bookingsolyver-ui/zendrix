import "server-only";
import { NextResponse } from "next/server";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verifyWebhookSignature } from "@/lib/integrations/hmac";
import { SaaSErrorLogger } from "@/lib/superadmin/events";

// Base dos controladores de webhooks externos assinados (banco, AGT...). Faz, por esta ordem, tudo o que é de segurança:
//   1. o segredo do fornecedor tem de existir (senão 503: nunca se aceita nada «aberto»);
//   2. corpo limitado em tamanho; 3. assinatura HMAC + timestamp recente (401); 4. JSON válido (400).
// Só depois chama `handleVerified` do controlador concreto. Os detalhes do porquê da recusa ficam nos registos do
// servidor, nunca na resposta (não se ajuda quem está a tentar forjar pedidos).

const MAX_BODY_BYTES = 256 * 1024;

export abstract class SignedWebhookController {
  protected abstract readonly label: string; // para os registos
  protected abstract readonly secretEnv: string; // nome da variável de ambiente com o segredo partilhado

  protected abstract handleVerified(payload: unknown): Promise<NextResponse>;

  async handle(request: Request): Promise<NextResponse> {
    const secret = process.env[this.secretEnv]?.trim();
    if (!secret) {
      console.error(`[${this.label}] ${this.secretEnv} não está definido; a recusar`);
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }

    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });

    const check = verifyWebhookSignature({ secret, rawBody, signature: request.headers.get(SIGNATURE_HEADER), timestamp: request.headers.get(TIMESTAMP_HEADER) });
    if (!check.ok) {
      console.warn(`[${this.label}] 401: ${check.reason}`);
      // Um segredo errado numa integração (banco, AGT) é um alarme: avisa a equipa (agrupado: o mesmo erro só uma vez por 10 min).
      SaaSErrorLogger.captureAfter({ route: `/api/${this.label}`, method: "POST", status: 401, kind: "unauthorized", severity: "warning", message: `assinatura recusada (${check.reason})`, alert: true });
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    try {
      return await this.handleVerified(payload);
    } catch (err) {
      // 500: o fornecedor repete, e aplicar é idempotente.
      console.error(`[${this.label}] falhou`, err);
      SaaSErrorLogger.captureAfter({ route: `/api/${this.label}`, method: "POST", status: 500, error: err });
      return NextResponse.json({ error: "processing_failed" }, { status: 500 });
    }
  }
}
