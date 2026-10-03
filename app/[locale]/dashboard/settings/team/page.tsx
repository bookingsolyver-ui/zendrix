import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { SeatsBanner } from "@/components/dashboard/settings/team/seats-banner";
import { TeamManager } from "@/components/dashboard/settings/team/team-manager";
import type { PendingInvite, TeamMember } from "@/components/dashboard/settings/team/team-data";
import { getCurrentUser } from "@/lib/auth/current-user";
import { evaluateAccess } from "@/lib/billing/policy";
import { prisma } from "@/lib/prisma";
import { listPendingInvites } from "@/lib/team/invites";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const currentUser = await getCurrentUser();
  const workspace = currentUser?.workspace;

  const [rows, pending] = workspace
    ? await Promise.all([
        prisma.user.findMany({
          where: { workspaceId: workspace.id },
          select: { id: true, authId: true, name: true, email: true, role: true },
          // O proprietário primeiro, depois por antiguidade.
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        }),
        listPendingInvites(workspace.id),
      ])
    : [[], []];

  const members: TeamMember[] = rows.map((row) => ({
    id: row.id,
    name: row.name ?? row.email.split("@")[0],
    email: row.email,
    role: row.role,
    lastAccess: row.authId === currentUser?.authId ? "Agora" : "—",
    isSelf: row.authId === currentUser?.authId,
  }));
  const invites: PendingInvite[] = pending.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt.toISOString(),
  }));

  const planActive = workspace
    ? evaluateAccess(workspace.subStatus, workspace.trialEndsAt ? new Date(workspace.trialEndsAt) : null, new Date(), workspace.blocked).active
    : false;

  return (
    <>
      <DashboardPageHeader
        title="Equipa e Permissões"
        subtitle="Convide colegas por e-mail e defina o que cada um pode fazer na sua conta Zentrix."
      />

      <SeatsBanner occupied={members.length + invites.length} />
      <TeamManager members={members} invites={invites} myRole={currentUser?.role ?? null} planActive={planActive} />
    </>
  );
}
