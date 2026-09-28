import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PartnersHeader } from "@/components/partners/partners-header";
import { PartnersHero } from "@/components/partners/partners-hero";
import { HowItWorksSection } from "@/components/partners/how-it-works-section";
import { BenefitsBento } from "@/components/partners/benefits-bento";
import { AudienceSection } from "@/components/partners/audience-section";
import { PartnersFinalCta } from "@/components/partners/partners-final-cta";
import { SiteFooter } from "@/components/landing/site-footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Partners" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function PartnersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <PartnersHeader />
      <main className="flex-1">
        <PartnersHero />
        <HowItWorksSection />
        <BenefitsBento />
        <AudienceSection />
        <PartnersFinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
