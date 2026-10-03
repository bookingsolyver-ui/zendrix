import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { SetupChecklist } from "@/components/dashboard/onboarding/setup-checklist";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSetupProgress } from "@/lib/onboarding/progress";

// Primeiros passos: o caminho guiado "ligar canal -> preencher a ficha -> ligar a IA". Fica nas Configurações
// (sempre acessível) e o painel mostra o mesmo cartão enquanto houver passos por fazer.
export default async function SetupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  const canSetup = user?.role === "OWNER" || user?.role === "MANAGER";
  const progress = user?.workspace ? await getSetupProgress(user.workspace.id) : null;

  return (
    <>
      <DashboardPageHeader title="Primeiros passos" subtitle="Ponha a Zetrix a atender os seus clientes em três passos." />
      {progress && canSetup ? (
        <SetupChecklist progress={progress} showWhenComplete />
      ) : (
        <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
          A configuração inicial é feita pelo proprietário ou por um gestor da conta.
        </p>
      )}
    </>
  );
}
