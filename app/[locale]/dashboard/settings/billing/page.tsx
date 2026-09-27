import { setRequestLocale } from "next-intl/server";
import { CalendarClock, CreditCard, Send, ShieldCheck } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { SummaryCard } from "@/components/dashboard/billing/summary-card";
import { BillingPricing } from "@/components/dashboard/billing/billing-pricing";
import { AddonsSection } from "@/components/billing/AddonsSection";

function getTrialEndDateLabel(locale: string) {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(trialEnd);
  } catch {
    return trialEnd.toLocaleDateString();
  }
}

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const nextBillingDate = getTrialEndDateLabel(locale);

  return (
    <>
      <DashboardPageHeader
        title="Cobrança"
        subtitle="Gira o seu plano, ciclo de faturação e histórico de pagamentos."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={ShieldCheck} label="Plano atual" value="Pro" accent hint="Faturação mensal" />
        <SummaryCard
          icon={CalendarClock}
          label="Estado"
          value="Teste grátis"
          hint="14 dias restantes"
        />
        <SummaryCard
          icon={CreditCard}
          label="Próxima cobrança"
          value={nextBillingDate}
          hint="Sem cartão associado"
        />
        <SummaryCard icon={Send} label="Envios no mês" value="0 / Ilimitado" hint="Período de teste" />
      </div>

      <div className="mt-10">
        <BillingPricing />
      </div>

      <div className="mt-10">
        <AddonsSection />
      </div>
    </>
  );
}
