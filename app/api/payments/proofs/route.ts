import { authErrorResponse } from "@/lib/api-auth";
import { ALL_ROLES, ok } from "@/lib/http/route";
import { contactChoiceLabel } from "@/lib/inbox/display";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { signedMediaUrls } from "@/lib/storage/media";

export const dynamic = "force-dynamic";

// Comprovativos de pagamento da organização (os pendentes primeiro), com o ficheiro em URL temporário. Qualquer papel
// os VÊ (a equipa de atendimento precisa de saber o que está por validar); só gestores decidem (rota [id]).
//   ?conversationId=…  só os dessa conversa (o cartão da Inbox)   ·   ?status=PENDING  filtra por estado
export async function GET(request: Request) {
  try {
    const who = await requireRole(ALL_ROLES);
    const params = new URL(request.url).searchParams;
    const status = params.get("status");
    const conversationId = params.get("conversationId");

    const rows = await prisma.paymentProof.findMany({
      where: {
        workspaceId: who.workspaceId,
        ...(status === "PENDING" || status === "APPROVED" || status === "REJECTED" ? { status } : {}),
        ...(conversationId ? { conversationId } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    });
    rows.sort((a, b) => Number(b.status === "PENDING") - Number(a.status === "PENDING")); // pendentes no topo

    const [contacts, urls] = await Promise.all([
      prisma.contact.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.contactId))] }, workspaceId: who.workspaceId }, select: { id: true, name: true, waId: true, platform: true } }),
      signedMediaUrls(who.workspaceId, rows.flatMap((r) => (r.mediaPath ? [r.mediaPath] : []))),
    ]);
    const byId = new Map(contacts.map((c) => [c.id, c]));

    return ok({
      canDecide: who.role === "OWNER" || who.role === "MANAGER",
      proofs: rows.map((r) => {
        const contact = byId.get(r.contactId);
        return {
          id: r.id,
          conversationId: r.conversationId,
          contact: contact ? contactChoiceLabel(contact.name, contact.waId, contact.platform) : "Contacto removido",
          itemName: r.itemName,
          amountLabel: r.amountLabel,
          status: r.status,
          note: r.note,
          createdAt: r.createdAt.toISOString(),
          decidedAt: r.decidedAt?.toISOString() ?? null,
          mimeType: r.mimeType,
          fileUrl: r.mediaPath ? (urls[r.mediaPath] ?? null) : null,
        };
      }),
    });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    throw err;
  }
}
