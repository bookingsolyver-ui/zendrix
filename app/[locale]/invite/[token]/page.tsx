import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";
import { legalLang } from "@/lib/legal/content";
import { ROLE_LABEL } from "@/lib/roles";
import { findInviteByToken } from "@/lib/team/invites";

// O token vai no URL: não deve aparecer em motores de busca nem em cabeçalhos Referer.
export const metadata: Metadata = { title: "Invitation · Kwanza Flow", robots: { index: false }, referrer: "no-referrer" };

export default async function InvitePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const lang = legalLang(locale);
  const invite = await findInviteByToken(token);

  if (!invite) {
    return (
      <AuthShell
        title={lang === "pt" ? "Convite inválido" : "Invalid invitation"}
        subtitle={lang === "pt" ? "Este link expirou, já foi usado ou foi revogado." : "This link has expired, was already used, or was revoked."}
        footer={
          <Link href="/login" className="font-medium text-neon-green hover:text-neon-green-2">
            {lang === "pt" ? "Ir para o login" : "Go to login"}
          </Link>
        }
      >
        <p className="text-sm text-muted">
          {lang === "pt" ? "Peça um novo convite a quem o convidou." : "Ask the person who invited you for a new invitation."}
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={lang === "pt" ? "Aceitar convite" : "Accept invitation"}
      subtitle={
        lang === "pt"
          ? `Foi convidado para a equipa ${invite.workspace.name} como ${ROLE_LABEL[invite.role]}.`
          : `You were invited to the ${invite.workspace.name} team as ${ROLE_LABEL[invite.role]}.`
      }
      footer={
        <>
          {lang === "pt" ? "Já tem conta?" : "Already have an account?"}{" "}
          <Link href="/login" className="font-medium text-neon-green hover:text-neon-green-2">
            {lang === "pt" ? "Entrar" : "Sign in"}
          </Link>
        </>
      }
    >
      <AcceptInviteForm token={token} email={invite.email} lang={lang} />
    </AuthShell>
  );
}
