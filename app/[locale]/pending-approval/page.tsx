import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { PendingActions } from "@/components/auth/pending-actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

// A página para quem se registou mas ainda não foi aprovado pela administração (ou foi rejeitado). Quem já está
// aprovado não a vê (vai para o painel) e quem não tem sessão vai para o login.
export default async function PendingApprovalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  const restriction = user.workspace?.restriction;
  if (restriction !== "pending_approval" && restriction !== "rejected") redirect(`/${locale}/dashboard`);

  const t = await getTranslations("Approval");
  const rejected = restriction === "rejected";
  const note = rejected && user.workspace ? (await prisma.workspace.findUnique({ where: { id: user.workspace.id }, select: { approvalNote: true } }))?.approvalNote : null;

  return (
    <AuthShell title={rejected ? t("rejectedTitle") : t("title")} subtitle={rejected ? t("rejectedText") : t("text")} footer={user.email}>
      {note && (
        <p className="mb-5 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
          <span className="block text-xs text-white/40">{t("reason")}</span>
          {note}
        </p>
      )}
      <PendingActions checkLabel={t("checkAgain")} logoutLabel={t("logout")} />
    </AuthShell>
  );
}
