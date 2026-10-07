import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { authErrorResponse } from "@/lib/api-auth";
import { ALL_ROLES, ok } from "@/lib/http/route";
import { templateVariables } from "@/lib/templates/schema";

// Modelos aprovados e enviáveis, para o seletor da Inbox. Qualquer papel (a equipa de atendimento também envia).
export async function GET() {
  try {
    const who = await requireRole(ALL_ROLES);
    const rows = await prisma.messageTemplate.findMany({
      where: { workspaceId: who.workspaceId, metaStatus: "APPROVED", sendable: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: true, language: true, body: true },
    });
    return ok({ templates: rows.map((row) => ({ ...row, variables: templateVariables(row.body) })) });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    throw err;
  }
}
