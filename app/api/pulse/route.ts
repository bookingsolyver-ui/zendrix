import { authErrorResponse } from "@/lib/api-auth";
import { ALL_ROLES, ok } from "@/lib/http/route";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// Uma «assinatura» barata da atividade da organização: muda quando chega ou sai uma mensagem, aparece um contacto
// ou muda o número de conversas por ler. Os ecrãs com indicadores fazem poll a isto (a cada poucos segundos) e só
// pedem os números todos quando a assinatura muda. Só da organização da sessão; nunca devolve conteúdo.
// (O Supabase Realtime não serve aqui: as tabelas não são legíveis pelo browser, de propósito: RLS forçado.)
export async function GET() {
  try {
    const who = await requireRole(ALL_ROLES);
    const workspaceId = who.workspaceId;
    const [message, contact, conversation, named] = await Promise.all([
      prisma.message.aggregate({ where: { workspaceId }, _max: { createdAt: true }, _count: { _all: true } }),
      prisma.contact.aggregate({ where: { workspaceId }, _max: { createdAt: true }, _count: { _all: true } }),
      prisma.conversation.aggregate({ where: { workspaceId }, _max: { lastMessageAt: true }, _sum: { unreadCount: true }, _count: { _all: true } }),
      prisma.contact.count({ where: { workspaceId, name: { not: null } } }), // um nome capturado muda isto
    ]);
    const sig = [
      message._max.createdAt?.getTime() ?? 0,
      message._count._all,
      contact._max.createdAt?.getTime() ?? 0,
      contact._count._all,
      conversation._max.lastMessageAt?.getTime() ?? 0,
      conversation._sum.unreadCount ?? 0,
      conversation._count._all,
      named,
    ].join(".");
    return ok({ sig }, 200);
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    throw err;
  }
}
