import { useTranslations } from "next-intl";
import { Logo } from "@/components/Logo";

export function SiteFooter() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
        <Logo size="sm" />
        <p className="text-sm text-white/40">
          © {year} Zentrix. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
