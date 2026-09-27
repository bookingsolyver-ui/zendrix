import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { LogosMarquee } from "@/components/landing/logos-marquee";
import { BentoGrid } from "@/components/landing/bento-grid";
import { FinalCta } from "@/components/landing/final-cta";
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
        <LogosMarquee />
        <BentoGrid />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
