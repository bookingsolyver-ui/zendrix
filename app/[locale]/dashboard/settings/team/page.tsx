import { setRequestLocale } from "next-intl/server";
import { UserPlus } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { SeatsBanner } from "@/components/dashboard/settings/team/seats-banner";
import { TeamTable } from "@/components/dashboard/settings/team/team-table";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Equipa e Permissões"
        subtitle="Convide colegas e defina o que cada um pode fazer na sua conta Zentrix."
        action={
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/[0.03]"
          >
            <UserPlus className="h-4 w-4" />
            Convidar Membro
          </button>
        }
      />

      <SeatsBanner />
      <TeamTable />
    </>
  );
}
