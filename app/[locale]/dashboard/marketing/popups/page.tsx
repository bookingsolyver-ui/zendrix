import { setRequestLocale } from "next-intl/server";
import { Plus, Sparkles } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { PopupCard } from "@/components/dashboard/marketing/popups/popup-card";
import { STORE_POPUPS } from "@/components/dashboard/marketing/popups/popups-data";
import { MarketingEmptyState } from "@/components/dashboard/marketing/empty-state";
import { SoonButton } from "@/components/ui/soon-button";

export default async function PopupsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Pop-ups na Loja"
        subtitle="Capte leads com popups gamificados diretamente no seu site."
        action={
          <SoonButton feature="Criar Pop-up"
            type="button"
            className="neon-btn flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-background"
          >
            <Plus className="h-4 w-4" />
            Criar Pop-up
          </SoonButton>
        }
      />

      {STORE_POPUPS.length === 0 ? (
        <MarketingEmptyState
          icon={Sparkles}
          title="Nenhum pop-up criado"
          description="Crie o seu primeiro pop-up gamificado para captar leads diretamente na loja."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {STORE_POPUPS.map((popup) => (
            <PopupCard key={popup.id} popup={popup} />
          ))}
        </div>
      )}
    </>
  );
}
