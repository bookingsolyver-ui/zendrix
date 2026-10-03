import { useLocale, useTranslations } from "next-intl";
import { Globe, Play } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";

export function PublicHeader({
  primaryCtaLabel,
  primaryCtaHref = "/register",
}: {
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
}) {
  const t = useTranslations("PublicHeader");
  const locale = useLocale();

  const navLinks = [
    { label: t("resources"), href: "/#section-features" },
    { label: t("pricing"), href: "/#pricing" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:gap-6 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />

          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/parceiros"
              className="text-sm font-medium text-emerald-400 underline decoration-emerald-400/40 decoration-2 underline-offset-4"
            >
              {t("referral")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden items-center gap-1.5 text-sm font-medium text-white/60 sm:flex">
            <Globe className="h-4 w-4" />
            {locale.toUpperCase()}
          </span>

          <Link
            href="/#faq"
            className="hidden items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white sm:flex"
          >
            <Play className="h-4 w-4" />
            {t("tutorials")}
          </Link>

          <Link
            href="/login"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
          >
            {t("login")}
          </Link>

          <Link
            href={primaryCtaHref}
            className="whitespace-nowrap rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-black sm:px-4 transition-colors hover:bg-emerald-400"
          >
            {primaryCtaLabel ?? (
              <>
                <span className="hidden sm:inline">{t("freeTrial")}</span>
                <span className="sm:hidden">{t("freeTrialShort")}</span>
              </>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
