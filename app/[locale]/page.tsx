import { setRequestLocale } from "next-intl/server";
import { PublicHeader } from "@/components/public-header";
import { Hero } from "@/components/landing/hero";
import { ProductPreview } from "@/components/landing/product-preview";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { SameNumberSection } from "@/components/landing/same-number-section";
import { OmnichannelSection } from "@/components/landing/omnichannel-section";
import { AiVoiceSchedulingSection } from "@/components/landing/ai-voice-scheduling-section";
import { AutomationFlowSection } from "@/components/landing/automation-flow-section";
import { ImproveWithAiSection } from "@/components/landing/improve-with-ai-section";
import { CampaignsSection } from "@/components/landing/campaigns-section";
import { PopupToWhatsAppSection } from "@/components/landing/popup-to-whatsapp-section";
import { UseCasesSection } from "@/components/landing/use-cases-section";
import { IntegrationsMarquee } from "@/components/landing/integrations-marquee";
import { WorkWithSection } from "@/components/landing/work-with-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { ReferralSection } from "@/components/landing/referral-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCtaSection } from "@/components/landing/final-cta-section";
import { SiteFooter } from "@/components/landing/site-footer";

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
        <SameNumberSection />
        <OmnichannelSection />
        <AiVoiceSchedulingSection />
        <AutomationFlowSection />
        <ImproveWithAiSection />
        <CampaignsSection />
        <PopupToWhatsAppSection />
        <UseCasesSection />
        <IntegrationsMarquee />
        <WorkWithSection />
        <PricingSection />
        <ReferralSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
