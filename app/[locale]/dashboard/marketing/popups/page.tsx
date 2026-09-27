import { setRequestLocale } from "next-intl/server";
import { Plus } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { PopupCard } from "@/components/dashboard/marketing/popups/popup-card";
import { STORE_POPUPS } from "@/components/dashboard/marketing/popups/popups-data";

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
          <button
            type="button"
            className="neon-btn flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-background"
          >
            <Plus className="h-4 w-4" />
            Criar Pop-up
          </button>
        }
      />

      {STORE_POPUPS.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
          <p className="text-sm text-white/50">Ainda não criou nenhum pop-up.</p>
        </div>
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
