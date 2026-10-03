import { after, NextResponse } from "next/server";
import { adminGuarded, logAdminAction } from "@/lib/admin/guard";
import { emailConfigured, sendEmail } from "@/lib/email/send";
import { MAX_NOTICE_RECIPIENTS, noticeInputSchema } from "@/lib/email/notice-schema";
import { processPendingEmails, queueNotification } from "@/lib/email/notify";
import { renderNotification } from "@/lib/email/notifications";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });

// Avisos do sistema (manutenção programada, novidades importantes). Só administradores da plataforma.
//   mode "test": envia UM e-mail de teste, só ao próprio administrador, na língua escolhida;
//   mode "send": regista um e-mail para cada proprietário das organizações do público escolhido (um por pessoa,
//                na língua dela) e começa a enviar; o cron acaba o que faltar.
export async function POST(request: Request) {
  return adminGuarded(request, "notices", async (admin) => {
    const parsed = noticeInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues.some((i) => i.message === "start_required") ? "start_required" : parsed.error.issues.some((i) => i.message === "end_before_start") ? "end_before_start" : "invalid_input", 400);
    const input = parsed.data;
    const payloadBase = { kind: input.kind, content: input.content, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null };

    if (input.mode === "test") {
      if (!emailConfigured()) return fail("email_not_configured", 409);
      const rendered = renderNotification("system_notice", { name: null, ...payloadBase }, input.testLang);
      if (!rendered.ok) return fail("invalid_input", 400);
      const result = await sendEmail({ to: admin.email, ...rendered.email });
      await logAdminAction(admin, "send_notice_test", null, { kind: input.kind, lang: input.testLang, ok: result.ok });
      return result.ok ? NextResponse.json({ success: true, sentTo: admin.email }) : fail("send_failed", 502);
    }

    // O público: proprietários de organizações APROVADAS (as por aprovar ou rejeitadas nem são clientes ainda).
    const owners = await prisma.user.findMany({
      where: { role: "OWNER", workspaceId: input.workspaceIds ? { in: input.workspaceIds } : undefined, workspace: { approvalStatus: "APPROVED", ...(input.audience === "active" ? { subStatus: "active" } : {}) } },
      orderBy: { createdAt: "asc" },
      take: MAX_NOTICE_RECIPIENTS + 1,
      select: { email: true, name: true, locale: true, workspaceId: true },
    });
    if (owners.length === 0) return fail("no_recipients", 409);
    if (owners.length > MAX_NOTICE_RECIPIENTS) return fail("too_many_recipients", 409);

    const notice = await prisma.systemNotice.create({
      data: { kind: input.kind, audience: input.audience, content: input.content, startsAt: input.startsAt ? new Date(input.startsAt) : null, endsAt: input.endsAt ? new Date(input.endsAt) : null, createdById: admin.userId, createdByEmail: admin.email, totalRecipients: owners.length },
      select: { id: true },
    });
    let queued = 0;
    for (const owner of owners) {
      const id = await queueNotification({ kind: "system_notice", dedupeKey: notice.id, to: owner.email, locale: owner.locale, workspaceId: owner.workspaceId, noticeId: notice.id, payload: { name: owner.name, ...payloadBase } });
      if (id) queued++;
    }
    await logAdminAction(admin, "send_notice", null, { noticeId: notice.id, kind: input.kind, audience: input.audience, recipients: queued });
    // Começa já a enviar (sem atrasar a resposta); o que faltar, o cron envia.
    after(async () => {
      await processPendingEmails(60, Date.now() + 40_000);
    });
    return NextResponse.json({ success: true, noticeId: notice.id, recipients: queued, emailConfigured: emailConfigured() });
  });
}
