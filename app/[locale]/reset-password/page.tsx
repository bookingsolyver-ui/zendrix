import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false } };

// Só se chega aqui com a sessão que o link de recuperação abriu. Sem ela, o link expirou ou já foi usado.
export default async function ResetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth.reset");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthShell
        title={t("expiredTitle")}
        subtitle=""
        footer={
          <Link href="/forgot-password" className="font-medium text-neon-green hover:text-neon-green-2">
            {t("requestNew")}
          </Link>
        }
      >
        <p className="text-sm text-muted">{t("expiredBody")}</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("title")} subtitle={t("subtitle")} footer={null}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
