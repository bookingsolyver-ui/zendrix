import { setRequestLocale } from "next-intl/server";
import { PublicHeader } from "@/components/public-header";
import { Hero } from "@/components/landing/hero";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { TrustSection } from "@/components/landing/trust-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCtaSection } from "@/components/landing/final-cta-section";
import { SiteFooter } from "@/components/landing/site-footer";

// A landing descreve só o que o produto faz hoje: Inbox omnicanal com IA de vendas, campanhas, automações, popups
// de captação, CRM (Kanban, documentos e agenda) e contactos com segmentos. Os números do painel de exemplo estão marcados como ilustrativos; não há depoimentos nem métricas inventados.
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Hero />
        <FeaturesGrid />
        <HowItWorksSection />
        <TrustSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
