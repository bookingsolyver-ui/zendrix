import { setRequestLocale } from "next-intl/server";
import { PublicHeader } from "@/components/public-header";
import { Hero } from "@/components/landing/hero";
import { ProductPreview } from "@/components/landing/product-preview";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { OmnichannelSection } from "@/components/landing/omnichannel-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCtaSection } from "@/components/landing/final-cta-section";
import { SiteFooter } from "@/components/landing/site-footer";

// A landing descreve só o que o produto faz hoje: atendimento omnicanal (WhatsApp, Instagram, Messenger) numa
// Inbox partilhada pela equipa, com um assistente de IA treinado com a ficha do negócio.
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
        <ProductPreview />
        <FeaturesGrid />
        <OmnichannelSection />
        <HowItWorksSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
