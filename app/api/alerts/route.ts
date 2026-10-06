import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse } from "@/lib/api-auth";
import { NotificationService } from "@/lib/alerts/notification-service";
import { ALL_ROLES, fail, guarded, ok } from "@/lib/http/route";
import { requireRole } from "@/lib/rbac";

// Alertas por ler da organização (alimenta o <SmartAlertToast />).
export async function GET(request: Request) {
  try {
    const who = await requireRole(ALL_ROLES, request);
    return NextResponse.json({ success: true, alerts: await NotificationService.listUnread(who.workspaceId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/alerts] falhou", err);
    return fail("internal", 500);
  }
}

// Marcar como lidos (o utilizador fechou o aviso).
export async function POST(request: Request) {
  return guarded(request, ALL_ROLES, "alerts", async (who) => {
    const body = z.object({ ids: z.array(z.string().min(1).max(40)).min(1).max(50) }).safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("invalid_input", 400);
    return ok({ marked: await NotificationService.markRead(who.workspaceId, body.data.ids) });
  });
}
