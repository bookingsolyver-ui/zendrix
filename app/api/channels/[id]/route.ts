import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse } from "@/lib/api-auth";
import { decryptSecret } from "@/lib/crypto";
import { isSameOrigin } from "@/lib/http/origin";
import { unsubscribePage } from "@/lib/meta/oauth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { requireRole } from "@/lib/rbac";

const idSchema = z.string().min(1).max(64);

// Desliga um canal (WhatsApp, Instagram ou Messenger) da organização: apaga a ligação e as credenciais.
// As conversas e mensagens ficam (histórico); as respostas a esse canal passam a falhar até voltar a ligar.
// Só OWNER/MANAGER com sessão (uma chave de API não desliga canais).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });

  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    const id = idSchema.safeParse((await params).id);
    if (!id.success) return NextResponse.json({ success: false, error: "invalid_input" }, { status: 400 });

    const limited = await rateLimit(`channel-disconnect:${who.workspaceId}`, { limit: 20, windowMs: 10 * 60 * 1000 });
    if (!limited.ok) {
      return NextResponse.json(
        { success: false, error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
      );
    }

    // Sempre dentro da organização da sessão: o id de outra organização é um 404.
    const integration = await prisma.socialIntegration.findFirst({
      where: { id: id.data, workspaceId: who.workspaceId },
      select: { id: true, platform: true, pageId: true, accessToken: true },
    });
    if (!integration) return NextResponse.json({ success: false, error: "not_found" }, { status: 404 });

    // Instagram/Messenger: deixa de receber os eventos da página, a não ser que outra ligação (o mesmo
    // Facebook Page serve Instagram e Messenger) ainda a use. Best-effort: se falhar, desliga na mesma.
    let unsubscribed: boolean | null = null;
    if (integration.platform !== "WHATSAPP" && integration.pageId) {
      const stillUsed = await prisma.socialIntegration.count({
        where: { pageId: integration.pageId, id: { not: integration.id } },
      });
      if (stillUsed === 0) {
        try {
          unsubscribed = await unsubscribePage(integration.pageId, decryptSecret(integration.accessToken));
        } catch {
          unsubscribed = false; // token ilegível: nada a fazer na Meta
        }
      }
    }

    await prisma.socialIntegration.deleteMany({ where: { id: integration.id, workspaceId: who.workspaceId } });
    return NextResponse.json({ success: true, unsubscribed });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/channels] DELETE falhou", err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}
