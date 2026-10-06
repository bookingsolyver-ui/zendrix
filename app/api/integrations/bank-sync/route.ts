import { BankSyncController } from "@/lib/integrations/bank-sync";

// Webhook de pagamentos bancários (assinado com HMAC). Sem sessão: a autenticação é a assinatura.
export async function POST(request: Request) {
  return new BankSyncController().handle(request);
}
