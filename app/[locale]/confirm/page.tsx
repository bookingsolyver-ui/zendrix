import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ConfirmCard } from "@/components/auth/confirm-card";

// O token vai no URL: nunca em motores de busca nem em cabeçalhos Referer.
export const metadata: Metadata = { robots: { index: false }, referrer: "no-referrer" };

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token_hash, type, next } = await searchParams;
  const t = await getTranslations("Auth.confirm");

  const valid = token_hash && (type === "signup" || type === "recovery");
  return (
    <AuthShell
      title={!valid ? t("invalidTitle") : type === "signup" ? t("signupTitle") : t("recoveryTitle")}
      subtitle=""
      footer={
        <Link href="/login" className="font-medium text-neon-green hover:text-neon-green-2">
          {t("backToLogin")}
        </Link>
      }
    >
      {valid ? <ConfirmCard type={type} tokenHash={token_hash} next={next} /> : <p className="text-sm text-muted">{t("invalid")}</p>}
    </AuthShell>
  );
}
