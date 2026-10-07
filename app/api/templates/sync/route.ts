import { NextResponse } from "next/server";
import { MANAGERS, fail, guarded, ok } from "@/lib/http/route";
import { rateLimit } from "@/lib/rate-limit";
import { syncTemplates } from "@/lib/templates/service";

// Sincroniza com a conta WhatsApp Business: atualiza o estado (Pending/Approved/Rejected) e importa os modelos da Meta.
export async function POST(request: Request) {
  return guarded(request, MANAGERS, "templates/sync", async (who) => {
    if (!(await rateLimit(`tpl-sync:${who.workspaceId}`, { limit: 10, windowMs: 60 * 1000 })).ok) return fail("rate_limited", 429);
    const result = await syncTemplates(who.workspaceId);
    if (result.ok) return ok({ updated: result.updated, imported: result.imported, skipped: result.skipped });
    return NextResponse.json({ success: false, error: result.error, detail: result.detail }, { status: result.error === "meta_transient" ? 503 : 422 });
  });
}
