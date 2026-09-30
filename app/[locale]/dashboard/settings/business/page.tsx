import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { BusinessForm } from "@/components/dashboard/settings/business/business-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { loadBusinessState } from "@/lib/agent/business";

export default async function BusinessSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const state = user?.workspace
    ? await loadBusinessState(user.workspace.id)
    : null;

  return (
    <>
      <DashboardPageHeader
        title="Ficha do negócio"
        subtitle="O que o assistente de IA sabe sobre a sua empresa. Só responde com o que estiver aqui."
      />
      {state ? (
        <BusinessForm initial={state} />
      ) : (
        <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
          Não foi possível carregar a organização. Termine a sessão e entre de
          novo.
        </p>
      )}
    </>
  );
}
