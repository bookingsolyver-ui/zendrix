import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { SameNumberSection } from "@/components/landing/same-number-section";
import { OmnichannelSection } from "@/components/landing/omnichannel-section";
import { AiVoiceSchedulingSection } from "@/components/landing/ai-voice-scheduling-section";
import { AutomationFlowSection } from "@/components/landing/automation-flow-section";
import { UseCasesSection } from "@/components/landing/use-cases-section";
import { IntegrationsMarquee } from "@/components/landing/integrations-marquee";
import { PricingSection } from "@/components/landing/pricing-section";
import { ReferralSection } from "@/components/landing/referral-section";
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
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <SameNumberSection />
        <OmnichannelSection />
        <AiVoiceSchedulingSection />
        <AutomationFlowSection />
        <UseCasesSection />
        <IntegrationsMarquee />
        <PricingSection />
        <ReferralSection />
      </main>
      <SiteFooter />
    </div>
  );
}
