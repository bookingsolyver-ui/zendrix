// Modelos de e-mail. Puro (sem servidor): só constroem texto, por isso são testáveis. Tudo o que vem de
// fora (nomes, URLs) é escapado. Línguas: pt e en (o espanhol usa en, como as páginas legais).
import { legalLang, legalEntityFromEnv, type LegalLang } from "../legal/content.ts";
import { ROLE_LABEL, type Role } from "../roles.ts";

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const esc = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const emailLang = (locale: string | undefined): LegalLang => legalLang(locale ?? "pt");

// A moldura comum: cartão simples, botão, rodapé com a entidade. Só estilos inline (os clientes de e-mail
// ignoram folhas de estilo) e uma largura que funciona no telemóvel.
function layout(input: { preheader: string; heading: string; paragraphs: string[]; cta?: { label: string; url: string }; footnote?: string; lang: LegalLang }): string {
  const entity = legalEntityFromEnv();
  const paragraphs = input.paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151">${p}</p>`)
    .join("");
  const button = input.cta
    ? `<p style="margin:24px 0"><a href="${esc(input.cta.url)}" style="display:inline-block;background:#10b981;color:#06281d;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:999px">${esc(input.cta.label)}</a></p>` +
      `<p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:#6b7280">${input.lang === "pt" ? "Se o botão não funcionar, copie este endereço para o browser:" : "If the button doesn't work, copy this address into your browser:"}<br><span style="word-break:break-all">${esc(input.cta.url)}</span></p>`
    : "";
  const footnote = input.footnote ? `<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#6b7280">${input.footnote}</p>` : "";
  const sender = [entity.name, entity.address].filter(Boolean).map((v) => esc(v as string)).join(" · ");
  return (
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(input.heading)}</title></head>` +
    `<body style="margin:0;padding:0;background:#f3f4f6"><span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(input.preheader)}</span>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6"><tr><td align="center" style="padding:32px 16px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px">` +
    `<tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">` +
    `<p style="margin:0 0 24px;font-size:18px;font-weight:700;color:#111827">Zetrix</p>` +
    `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827">${esc(input.heading)}</h1>` +
    `${paragraphs}${button}${footnote}</td></tr></table>` +
    `<p style="max-width:520px;margin:16px auto 0;font-family:-apple-system,Arial,sans-serif;font-size:12px;color:#9ca3af">${sender}</p>` +
    `</td></tr></table></body></html>`
  );
}

const greeting = (name: string | null | undefined, lang: LegalLang) =>
  name?.trim() ? (lang === "pt" ? `Olá, ${name.trim()}!` : `Hi ${name.trim()}!`) : lang === "pt" ? "Olá!" : "Hi!";

// ------------------------------------------------------------------------------------------ confirmar o registo
export function confirmSignupEmail(input: { name?: string | null; url: string; lang: LegalLang }): EmailContent {
  const { lang, url } = input;
  const hello = greeting(input.name, lang);
  if (lang === "pt") {
    return {
      subject: "Confirme o seu e-mail para ativar a conta Zetrix",
      text: `${hello}\n\nPara ativar a sua conta Zetrix, confirme o seu e-mail:\n${url}\n\nSe não criou uma conta, ignore esta mensagem.`,
      html: layout({ lang, preheader: "Confirme o seu e-mail para ativar a conta.", heading: "Confirme o seu e-mail", paragraphs: [esc(hello), "Falta só um passo para ativar a sua conta Zetrix."], cta: { label: "Confirmar e-mail", url }, footnote: "Se não criou uma conta, ignore esta mensagem." }),
    };
  }
  return {
    subject: "Confirm your email to activate your Zetrix account",
    text: `${hello}\n\nTo activate your Zetrix account, confirm your email:\n${url}\n\nIf you didn't create an account, ignore this message.`,
    html: layout({ lang, preheader: "Confirm your email to activate your account.", heading: "Confirm your email", paragraphs: [esc(hello), "One last step to activate your Zetrix account."], cta: { label: "Confirm email", url }, footnote: "If you didn't create an account, ignore this message." }),
  };
}

// --------------------------------------------------------------------------------------------- boas-vindas
export function welcomeEmail(input: { name?: string | null; dashboardUrl: string; lang: LegalLang }): EmailContent {
  const { lang, dashboardUrl } = input;
  const hello = greeting(input.name, lang);
  if (lang === "pt") {
    return {
      subject: "Bem-vindo à Zetrix",
      text: `${hello}\n\nA sua conta está ativa, com 14 dias grátis. Para começar:\n1. Ligue um canal (WhatsApp, Instagram ou Messenger)\n2. Preencha a ficha do negócio\n3. Ligue a IA\n\nAbra o painel: ${dashboardUrl}`,
      html: layout({ lang, preheader: "A sua conta está ativa. Três passos para começar.", heading: "Bem-vindo à Zetrix", paragraphs: [esc(hello), "A sua conta está ativa, com <strong>14 dias grátis</strong>. Para começar a atender os seus clientes:", "<strong>1.</strong> Ligue um canal (WhatsApp, Instagram ou Messenger)<br><strong>2.</strong> Preencha a ficha do negócio<br><strong>3.</strong> Ligue a IA"], cta: { label: "Abrir o painel", url: dashboardUrl } }),
    };
  }
  return {
    subject: "Welcome to Zetrix",
    text: `${hello}\n\nYour account is active, with a 14-day free trial. To get started:\n1. Connect a channel (WhatsApp, Instagram or Messenger)\n2. Fill in your business profile\n3. Turn on the AI\n\nOpen the dashboard: ${dashboardUrl}`,
    html: layout({ lang, preheader: "Your account is active. Three steps to get started.", heading: "Welcome to Zetrix", paragraphs: [esc(hello), "Your account is active, with a <strong>14-day free trial</strong>. To start serving your customers:", "<strong>1.</strong> Connect a channel (WhatsApp, Instagram or Messenger)<br><strong>2.</strong> Fill in your business profile<br><strong>3.</strong> Turn on the AI"], cta: { label: "Open the dashboard", url: dashboardUrl } }),
  };
}

// ------------------------------------------------------------------------------- recuperar a palavra-passe
export function passwordResetEmail(input: { url: string; lang: LegalLang }): EmailContent {
  const { lang, url } = input;
  if (lang === "pt") {
    return {
      subject: "Redefinir a palavra-passe da Zetrix",
      text: `Recebemos um pedido para redefinir a palavra-passe da sua conta Zetrix. Escolha uma nova aqui:\n${url}\n\nO link é de uso único e expira em breve. Se não foi você, ignore esta mensagem: a sua palavra-passe não muda.`,
      html: layout({ lang, preheader: "Escolha uma nova palavra-passe.", heading: "Redefinir a palavra-passe", paragraphs: ["Recebemos um pedido para redefinir a palavra-passe da sua conta Zetrix."], cta: { label: "Escolher nova palavra-passe", url }, footnote: "O link é de uso único e expira em breve. Se não foi você, ignore esta mensagem: a sua palavra-passe não muda." }),
    };
  }
  return {
    subject: "Reset your Zetrix password",
    text: `We received a request to reset your Zetrix password. Choose a new one here:\n${url}\n\nThe link is single-use and expires soon. If it wasn't you, ignore this message: your password won't change.`,
    html: layout({ lang, preheader: "Choose a new password.", heading: "Reset your password", paragraphs: ["We received a request to reset the password of your Zetrix account."], cta: { label: "Choose a new password", url }, footnote: "The link is single-use and expires soon. If it wasn't you, ignore this message: your password won't change." }),
  };
}

// ---------------------------------------------------------------------------------------------- convite
export function inviteEmail(input: { workspaceName: string; inviterName: string; role: Role; url: string; lang?: LegalLang }): EmailContent {
  const lang = input.lang ?? "pt";
  const role = ROLE_LABEL[input.role];
  if (lang === "pt") {
    return {
      subject: `${input.inviterName} convidou-o para a equipa ${input.workspaceName} na Zetrix`,
      text: `Olá!\n\n${input.inviterName} convidou-o para a equipa "${input.workspaceName}" na Zetrix, com o papel de ${role}.\n\nPara aceitar e criar a sua conta, abra este link (válido por 7 dias):\n${input.url}\n\nSe não estava à espera deste convite, ignore esta mensagem.`,
      html: layout({ lang, preheader: `${input.inviterName} convidou-o para a equipa ${input.workspaceName}.`, heading: "Foi convidado para uma equipa", paragraphs: [`<strong>${esc(input.inviterName)}</strong> convidou-o para a equipa <strong>${esc(input.workspaceName)}</strong> na Zetrix, com o papel de <strong>${esc(role)}</strong>.`], cta: { label: "Aceitar o convite", url: input.url }, footnote: "O link é válido por 7 dias. Se não estava à espera deste convite, ignore esta mensagem." }),
    };
  }
  return {
    subject: `${input.inviterName} invited you to the ${input.workspaceName} team on Zetrix`,
    text: `Hi!\n\n${input.inviterName} invited you to the "${input.workspaceName}" team on Zetrix, as ${role}.\n\nTo accept and create your account, open this link (valid for 7 days):\n${input.url}\n\nIf you weren't expecting this invitation, ignore this message.`,
    html: layout({ lang, preheader: `${input.inviterName} invited you to the ${input.workspaceName} team.`, heading: "You've been invited to a team", paragraphs: [`<strong>${esc(input.inviterName)}</strong> invited you to the <strong>${esc(input.workspaceName)}</strong> team on Zetrix, as <strong>${esc(role)}</strong>.`], cta: { label: "Accept the invitation", url: input.url }, footnote: "The link is valid for 7 days. If you weren't expecting this invitation, ignore this message." }),
  };
}

// -------------------------------------------------------------------------------- conta recebida (por aprovar)
export function pendingReviewEmail(input: { name?: string | null; lang: LegalLang }): EmailContent {
  const { lang } = input;
  const hello = greeting(input.name, lang);
  if (lang === "pt") {
    return {
      subject: "Recebemos o seu registo na Zetrix",
      text: `${hello}\n\nRecebemos o seu registo. Antes de ativar a conta, a nossa equipa vai revê-lo. Receberá um e-mail assim que for aprovado.`,
      html: layout({ lang, preheader: "O seu registo está a ser revisto.", heading: "Recebemos o seu registo", paragraphs: [esc(hello), "Antes de ativar a conta, a nossa equipa vai revê-lo. Receberá um e-mail assim que for <strong>aprovado</strong>."] }),
    };
  }
  return {
    subject: "We received your Zetrix sign-up",
    text: `${hello}\n\nWe received your sign-up. Our team will review it before activating the account. You will get an email as soon as it is approved.`,
    html: layout({ lang, preheader: "Your sign-up is being reviewed.", heading: "We received your sign-up", paragraphs: [esc(hello), "Our team will review it before activating the account. You will get an email as soon as it is <strong>approved</strong>."] }),
  };
}

// ------------------------------------------------------------------------------------------ conta aprovada
export function accountApprovedEmail(input: { name?: string | null; dashboardUrl: string; lang: LegalLang }): EmailContent {
  const { lang, dashboardUrl } = input;
  const hello = greeting(input.name, lang);
  if (lang === "pt") {
    return {
      subject: "A sua conta Zetrix foi aprovada",
      text: `${hello}\n\nA sua conta foi aprovada e já está ativa, com 14 dias grátis a contar de hoje. Abra o painel: ${dashboardUrl}`,
      html: layout({ lang, preheader: "A sua conta está ativa.", heading: "A sua conta foi aprovada", paragraphs: [esc(hello), "A sua conta já está ativa, com <strong>14 dias grátis</strong> a contar de hoje."], cta: { label: "Abrir o painel", url: dashboardUrl } }),
    };
  }
  return {
    subject: "Your Zetrix account was approved",
    text: `${hello}\n\nYour account was approved and is now active, with a 14-day free trial starting today. Open the dashboard: ${dashboardUrl}`,
    html: layout({ lang, preheader: "Your account is active.", heading: "Your account was approved", paragraphs: [esc(hello), "Your account is now active, with a <strong>14-day free trial</strong> starting today."], cta: { label: "Open the dashboard", url: dashboardUrl } }),
  };
}
