import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/Logo";

export function SiteHeader() {
  const t = useTranslations("Nav");

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo />

        <nav className="hidden items-center gap-8 text-sm text-white/60 md:flex">
          <a href="#product" className="transition-colors hover:text-white">
            {t("product")}
          </a>
          <a href="#solutions" className="transition-colors hover:text-white">
            {t("solutions")}
          </a>
          <a href="#pricing" className="transition-colors hover:text-white">
            {t("pricing")}
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <Link
            href="/dashboard"
            className="hidden text-sm text-white/60 transition-colors hover:text-white sm:inline"
          >
            {t("login")}
          </Link>
          <Link
            href="/onboarding"
            className="bright-border-btn rounded-full bg-white/[0.03] px-4 py-2 text-sm font-semibold text-foreground"
          >
            {t("getStarted")}
          </Link>
        </div>
      </div>
    </header>
  );
}
