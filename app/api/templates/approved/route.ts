import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { authErrorResponse } from "@/lib/api-auth";
import { ALL_ROLES, ok } from "@/lib/http/route";
import { templateVariables } from "@/lib/templates/schema";
import { activeWhatsAppKind } from "@/lib/whatsapp/channel-kind";

// Modelos para o seletor da Inbox: na API oficial só os aprovados e enviáveis; no QR Code (OpenWA) todos (saem como texto). Qualquer papel (a equipa de atendimento também envia).
export async function GET() {
  try {
    const who = await requireRole(ALL_ROLES);
    const kind = await activeWhatsAppKind(who.workspaceId);
    const rows = await prisma.messageTemplate.findMany({
      where: kind === "qr" ? { workspaceId: who.workspaceId } : { workspaceId: who.workspaceId, metaStatus: "APPROVED", sendable: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: true, language: true, body: true },
    });
    return ok({ channel: kind, templates: rows.map((row) => ({ ...row, variables: templateVariables(row.body) })) });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    throw err;
  }
}
