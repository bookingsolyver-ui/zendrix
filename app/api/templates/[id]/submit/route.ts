import { NextResponse } from "next/server";
import { z } from "zod";
import { MANAGERS, fail, guarded, ok } from "@/lib/http/route";
import { rateLimit } from "@/lib/rate-limit";
import { submitTemplate } from "@/lib/templates/service";
import { idSchema } from "@/lib/validations/team";

const bodySchema = z.object({ examples: z.array(z.string().trim().max(100)).max(20).default([]) });

// Submete o modelo à Meta para aprovação oficial. Devolve o detalhe do erro da Meta (ex.: variável no fim do texto).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(request, MANAGERS, "templates/[id]/submit", async (who) => {
    const id = idSchema.safeParse((await params).id);
    const body = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!id.success || !body.success) return fail("invalid_input", 400);
    if (!(await rateLimit(`tpl-submit:${who.workspaceId}`, { limit: 20, windowMs: 60 * 60 * 1000 })).ok) return fail("rate_limited", 429);

    const result = await submitTemplate(who.workspaceId, id.data, body.data.examples);
    if (result.ok) return ok({ status: result.status });
    const status = result.error === "not_found" ? 404 : result.error === "already_submitted" ? 409 : result.error === "meta_transient" ? 503 : 422;
    return NextResponse.json({ success: false, error: result.error, detail: result.detail }, { status });
  });
}
