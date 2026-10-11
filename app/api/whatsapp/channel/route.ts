import { authErrorResponse } from "@/lib/api-auth";
import { ALL_ROLES, ok } from "@/lib/http/route";
import { requireRole } from "@/lib/rbac";
import { activeWhatsAppKind } from "@/lib/whatsapp/channel-kind";

export const dynamic = "force-dynamic";

// Qual o canal de WhatsApp ativo ("meta" | "qr" | null). A Inbox usa-o para saber se vale a janela de 24 h da Meta.
export async function GET() {
  try {
    const who = await requireRole(ALL_ROLES);
    return ok({ kind: await activeWhatsAppKind(who.workspaceId) });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    throw err;
  }
}
