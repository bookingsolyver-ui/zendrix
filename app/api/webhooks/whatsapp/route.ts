import { handleMetaGet, handleMetaPost } from "@/lib/meta/handler";

// URL original do webhook, mantido para não ser preciso reconfigurar a Meta: faz exactamente o mesmo que
// /api/meta/webhook (webhook único para WhatsApp, Instagram e Messenger). Ver lib/meta/handler.ts.
export const maxDuration = 60;

export async function GET(request: Request) {
  return handleMetaGet(request);
}

export async function POST(request: Request) {
  return handleMetaPost(request);
}
