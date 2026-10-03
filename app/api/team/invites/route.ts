import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { getAccess, subscriptionRequiredResponse } from "@/lib/billing/access";
import { emailConfigured, sendEmail } from "@/lib/email/send";
import { isSameOrigin, appOrigin } from "@/lib/http/origin";
import { pickLocale } from "@/lib/meta/oauth-response";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { requireRole } from "@/lib/rbac";
import { grantableRoles, TEAM_SEATS } from "@/lib/roles";
import { inviteEmail } from "@/lib/team/invites";
import { generateInviteToken, INVITE_TTL_DAYS } from "@/lib/team/invite-token";
import { inviteSchema } from "@/lib/validations/team";

// Convidar alguém para a equipa. Só OWNER/MANAGER, só com sessão, só com plano ativo. O MANAGER só convida
// Agentes (STAFF). A resposta traz o link do convite: se o e-mail não estiver configurado (ou falhar), quem
// convida pode copiá-lo e enviá-lo por outra via.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });

  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    if (!(await getAccess(who.workspaceId)).active) return subscriptionRequiredResponse();

    const limited = await rateLimit(`team-invite:${who.workspaceId}`, { limit: 20, windowMs: 60 * 60 * 1000 });
    if (!limited.ok) {
      return NextResponse.json(
        { success: false, error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
      );
    }

    const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, error: "invalid_input" }, { status: 400 });
    const { email, role, locale } = parsed.data;

    // Nunca se dá mais poder do que o que se tem (um MANAGER só convida STAFF).
    if (!grantableRoles(who.role).includes(role)) {
      return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
    }

    // Um utilizador pertence a UMA organização: quem já tem conta (aqui ou noutra) não pode ser convidado.
    const existing = await prisma.user.findUnique({ where: { email }, select: { workspaceId: true } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: existing.workspaceId === who.workspaceId ? "already_member" : "already_has_account" },
        { status: 409 },
      );
    }

    const [members, pending] = await Promise.all([
      prisma.user.count({ where: { workspaceId: who.workspaceId } }),
      prisma.teamInvite.count({
        where: { workspaceId: who.workspaceId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      }),
    ]);
    // Reenviar o convite a quem já tem um pendente não ocupa um lugar novo.
    const samePending = await prisma.teamInvite.count({
      where: { workspaceId: who.workspaceId, email, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (samePending === 0 && members + pending >= TEAM_SEATS) {
      return NextResponse.json({ success: false, error: "seats_full" }, { status: 409 });
    }

    const { token, hash } = generateInviteToken();
    const inviter = who.userEmail
      ? await prisma.user.findUnique({ where: { email: who.userEmail }, select: { id: true, name: true } })
      : null;
    const workspace = await prisma.workspace.findUnique({ where: { id: who.workspaceId }, select: { name: true } });

    const invite = await prisma.$transaction(async (tx) => {
      // O convite anterior para o mesmo e-mail deixa de valer: só o último link funciona.
      await tx.teamInvite.updateMany({
        where: { workspaceId: who.workspaceId, email, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return tx.teamInvite.create({
        data: {
          workspaceId: who.workspaceId,
          email,
          role,
          tokenHash: hash,
          invitedById: inviter?.id ?? null,
          expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
        },
        select: { id: true, email: true, role: true, expiresAt: true },
      });
    });

    const inviteUrl = `${appOrigin(request)}/${pickLocale(locale)}/invite/${token}`;
    const message = inviteEmail({
      workspaceName: workspace?.name ?? "Zentrix",
      inviterName: inviter?.name ?? who.userEmail ?? "Um colega",
      role,
      url: inviteUrl,
    });
    const emailSent = emailConfigured() ? await sendEmail({ to: email, ...message }) : false;

    return NextResponse.json({ success: true, invite, inviteUrl, emailSent }, { status: 201 });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/team/invites] POST falhou", err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}
