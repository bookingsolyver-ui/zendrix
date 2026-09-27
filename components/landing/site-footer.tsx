import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg neon-btn text-xs font-bold text-background">
              Z
            </span>
            <span className="font-semibold tracking-tight">Zentrix</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted">{t("tagline")}</p>
        </div>

        <div className="flex gap-16 text-sm text-muted">
          <div className="flex flex-col gap-2">
            <span className="font-medium text-foreground">{t("product")}</span>
            <span>{t("product")}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-foreground">{t("company")}</span>
            <span>{t("company")}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-medium text-foreground">{t("legal")}</span>
            <span>{t("legal")}</span>
          </div>
        </div>
      </div>
      <div className="border-t border-border px-6 py-6 text-center text-xs text-muted">
        © {year} Zentrix. {t("rights")}
      </div>
    </footer>
  );
}
