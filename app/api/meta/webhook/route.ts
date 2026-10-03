import { handleMetaGet, handleMetaPost } from "@/lib/meta/handler";

// Endpoint único da Meta para WhatsApp, Instagram e Messenger. Registar no painel da app da Meta
// (Webhooks → Callback URL) com o WHATSAPP_VERIFY_TOKEN, e subscrever os objetos: whatsapp_business_account
// (campo messages), instagram (messages) e page (messages). A lógica vive em lib/meta/handler.ts.
//
// O agente corre depois de responder à Meta (after): modelo + voz + upload podem levar dezenas de
// segundos, e em alojamento serverless esse trabalho conta para a duração máxima da função.
export const maxDuration = 60;

export async function GET(request: Request) {
  return handleMetaGet(request);
}

export async function POST(request: Request) {
  return handleMetaPost(request);
}
