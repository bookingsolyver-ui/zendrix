import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";

export function PartnersHeader() {
  const t = useTranslations("Partners.nav");

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Logo href="/parceiros" />
          <span className="hidden text-sm text-white/30 sm:inline">| {t("logoSuffix")}</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden text-sm text-white/60 transition-colors hover:text-white sm:inline"
          >
            {t("login")}
          </Link>
          <Link
            href="/onboarding"
            className="neon-green-btn rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-background hover:bg-green-400"
          >
            {t("cta")}
          </Link>
        </div>
      </div>
    </header>
  );
}
