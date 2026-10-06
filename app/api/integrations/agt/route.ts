import { AGTInvoiceService } from "@/lib/integrations/agt-invoice";

// Webhook da faturação AGT (assinado com HMAC). Sem sessão: a autenticação é a assinatura.
export async function POST(request: Request) {
  return new AGTInvoiceService().handle(request);
}
