import { useTranslations } from "next-intl";
import { Logo } from "@/components/Logo";
import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  const columns = [
    {
      title: t("product"),
      links: [
        { label: t("productPricing"), href: "#pricing" },
        { label: t("productIntegrations"), href: "#section-integrations" },
      ],
    },
    {
      title: t("company"),
      links: [
        { label: t("companyPartners"), href: "#section-refer-and-earn" },
        // Só com um e-mail de contacto configurado: sem ele não há para onde levar a ligação.
        ...(process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim()
          ? [{ label: t("companyContact"), href: `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL.trim()}` }]
          : []),
      ],
    },
    {
      title: t("legal"),
      links: [
        { label: t("legalPrivacy"), href: "/privacy" },
        { label: t("legalTerms"), href: "/terms" },
        { label: t("legalDeletion"), href: "/data-deletion" },
      ],
    },
  ];

  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm text-white/40">{t("tagline")}</p>
          </div>

          <div className="grid grid-cols-3 gap-8 sm:gap-14">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/30">
                  {column.title}
                </p>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("/") && !link.href.startsWith("/#") ? (
                        <Link
                          href={link.href}
                          className="text-sm text-white/50 transition-colors hover:text-white"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className="text-sm text-white/50 transition-colors hover:text-white"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 px-6 py-6 text-center text-xs text-white/30">
        © {year} Zentrix. {t("rights")}
      </div>
    </footer>
  );
}
