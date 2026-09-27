import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";

export function SiteHeader() {
  const t = useTranslations("Nav");

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg neon-btn text-sm font-bold text-background">
            Z
          </span>
          <span className="text-lg font-semibold tracking-tight">Zentrix</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">
            {t("product")}
          </a>
          <a href="#pricing" className="transition-colors hover:text-foreground">
            {t("pricing")}
          </a>
          <a href="#docs" className="transition-colors hover:text-foreground">
            {t("docs")}
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <Link
            href="/dashboard"
            className="hidden text-sm text-muted transition-colors hover:text-foreground sm:inline"
          >
            {t("login")}
          </Link>
          <Link
            href="/dashboard"
            className="neon-btn rounded-full px-4 py-2 text-sm font-semibold text-background"
          >
            {t("getStarted")}
          </Link>
        </div>
      </div>
    </header>
  );
}
