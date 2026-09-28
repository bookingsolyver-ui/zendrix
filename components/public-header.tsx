import { useLocale, useTranslations } from "next-intl";
import { Globe, Play } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";

export function PublicHeader({
  primaryCtaLabel,
  primaryCtaHref = "/onboarding",
}: {
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
}) {
  const t = useTranslations("PublicHeader");
  const locale = useLocale();

  const navLinks = [
    { label: t("resources"), href: "/#section-features" },
    { label: t("pricing"), href: "/#pricing" },
    { label: t("services"), href: "#" },
    { label: t("docs"), href: "#" },
    { label: t("blog"), href: "#" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-8">
          <Logo />

          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.slice(0, 2).map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <a
              href={navLinks[2].href}
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              {navLinks[2].label}
            </a>
            <Link
              href="/parceiros"
              className="text-sm font-medium text-emerald-400 underline decoration-emerald-400/40 decoration-2 underline-offset-4"
            >
              {t("referral")}
            </Link>
            {navLinks.slice(3).map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-1.5 text-sm font-medium text-white/60 sm:flex">
            <Globe className="h-4 w-4" />
            {locale.toUpperCase()}
          </span>

          <button
            type="button"
            className="hidden items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white sm:flex"
          >
            <Play className="h-4 w-4" />
            {t("tutorials")}
          </button>

          <Link
            href="/dashboard"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
          >
            {t("partnerArea")}
          </Link>

          <Link
            href={primaryCtaHref}
            className="rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-emerald-400"
          >
            {primaryCtaLabel ?? t("freeTrial")}
          </Link>
        </div>
      </div>
    </header>
  );
}
