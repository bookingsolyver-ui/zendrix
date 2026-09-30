import { setRequestLocale } from "next-intl/server";
import { UserPlus } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { SeatsBanner } from "@/components/dashboard/settings/team/seats-banner";
import { TeamTable } from "@/components/dashboard/settings/team/team-table";
import type { TeamMember } from "@/components/dashboard/settings/team/team-data";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { SoonButton } from "@/components/ui/soon-button";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const currentUser = await getCurrentUser();
  const rows = currentUser?.workspace
    ? await prisma.user.findMany({
        where: { workspaceId: currentUser.workspace.id },
        select: { id: true, authId: true, name: true, email: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  // There is no role model yet, so every member is an administrator; the signed-in one is "Agora".
  const members: TeamMember[] = rows.map((row) => ({
    id: row.id,
    name: row.name ?? row.email.split("@")[0],
    email: row.email,
    role: "Administrador",
    lastAccess: row.authId === currentUser?.authId ? "Agora" : "—",
  }));

  return (
    <>
      <DashboardPageHeader
        title="Equipa e Permissões"
        subtitle="Convide colegas e defina o que cada um pode fazer na sua conta Zentrix."
        action={
          <SoonButton feature="Convidar Membro"
            type="button"
            className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/[0.03]"
          >
            <UserPlus className="h-4 w-4" />
            Convidar Membro
          </SoonButton>
        }
      />

      <SeatsBanner occupied={members.length} />
      <TeamTable members={members} />
    </>
  );
}
