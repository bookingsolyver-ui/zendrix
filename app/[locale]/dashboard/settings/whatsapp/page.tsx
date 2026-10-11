import { setRequestLocale } from "next-intl/server";
import { ArrowUpRight, Smartphone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { SummaryCard } from "@/components/dashboard/billing/summary-card";
import { HowItWorksAccordion } from "@/components/dashboard/whatsapp/how-it-works-accordion";
import { DedicatedNumberSection } from "@/components/whatsapp/dedicated-number-section";
import { UpdateTokenForm } from "@/components/whatsapp/update-token-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getWhatsAppStatus } from "@/lib/whatsapp/status";

export default async function WhatsAppSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const { count, officialCount, qrConnected } = await getWhatsAppStatus(user?.workspace?.id);
  // NEXT_PUBLIC_WHATSAPP_OFFICIAL=false esconde por completo a API oficial da Meta (quem só usa o QR Code).
  const officialEnabled = process.env.NEXT_PUBLIC_WHATSAPP_OFFICIAL !== "false";
  // Ligar e trocar o token do número: só o proprietário e os gestores (as rotas também o exigem).
  const canManage = user?.role === "OWNER" || user?.role === "MANAGER";

  return (
    <>
      <DashboardPageHeader
        title="WhatsApp"
        subtitle="Ligue e gira os números de WhatsApp Business da sua conta."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard
          icon={Smartphone}
          label="Números conectados"
          value={String(count)}
          hint={count === 0 ? "Nenhum número ligado ainda" : "Número ligado à sua conta"}
        />
      </div>

      {!canManage && (
        <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
          Apenas o proprietário e os gestores podem ligar números e alterar o token. Peça-lhes para o fazerem.
        </p>
      )}

      {canManage && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">WhatsApp por QR Code</h2>
          <p className="mt-1 text-sm text-muted">
            {qrConnected
              ? "O seu número está ligado por QR Code. Funciona sem a API oficial nem tokens da Meta."
              : "Ligue o seu número lendo um código, sem passar pela Meta."}
          </p>
          <Link href="/dashboard/settings/whatsapp-qr" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-neon-green hover:text-neon-green-2">
            {qrConnected ? "Gerir o canal QR" : "Ligar por QR Code"}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {canManage && officialEnabled && officialCount > 0 && (
        <div className="mt-6">
          <UpdateTokenForm />
        </div>
      )}

      {canManage && officialEnabled && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Número dedicado</h2>
          <p className="mt-1 text-sm text-muted">
            Ligue um número que já é seu à API oficial do WhatsApp.
          </p>
          <div className="mt-5">
            <DedicatedNumberSection />
          </div>
        </div>
      )}

      <div className="mt-10">
        <HowItWorksAccordion />
      </div>
    </>
  );
}
