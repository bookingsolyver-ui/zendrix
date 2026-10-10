// Modelos de e-mail da Kwanza Flow. Puro (sem servidor): só constroem assunto, texto e HTML, por isso são testáveis.
// Todos existem em português (PT-PT), inglês e espanhol. Tudo o que vem de fora (nomes, motivos, URLs, textos do
// administrador) é escapado. O HTML usa só estilos inline e uma coluna de largura fixa, que funciona em
// computador, telemóvel e nos clientes de e-mail mais antigos.
import { legalEntityFromEnv } from "../legal/content.ts";
import type { Role } from "../roles.ts";

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export type EmailLang = "pt" | "en" | "es";
export const EMAIL_LANGS: readonly EmailLang[] = ["pt", "en", "es"];

// A língua de um destinatário: a que guardámos (ou a do pedido). Qualquer outra coisa cai no português.
export const emailLang = (locale: string | null | undefined): EmailLang => (locale === "en" || locale === "es" ? locale : "pt");

const esc = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const unesc = (value: string) => value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
// Texto simples a partir de um bloco de HTML já seguro (para a parte «text» do e-mail).
const toText = (html: string) => unesc(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""));
const b = (value: string) => `<strong>${esc(value)}</strong>`;

const LOCALES: Record<EmailLang, string> = { pt: "pt-PT", en: "en-GB", es: "es-ES" };
export function formatDate(date: Date, lang: EmailLang, withTime = false): string {
  return new Intl.DateTimeFormat(LOCALES[lang], { day: "numeric", month: "long", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}), timeZone: "Europe/Lisbon" }).format(date);
}

const PHRASES: Record<EmailLang, { copyLink: string; notification: string; hello: (name: string | null | undefined) => string }> = {
  pt: { copyLink: "Se o botão não funcionar, copie este endereço para o browser:", notification: "Recebeu este e-mail porque tem uma conta na Kwanza Flow.", hello: (n) => (n?.trim() ? `Olá, ${n.trim()}!` : "Olá!") },
  en: { copyLink: "If the button doesn't work, copy this address into your browser:", notification: "You received this email because you have a Kwanza Flow account.", hello: (n) => (n?.trim() ? `Hi ${n.trim()}!` : "Hi!") },
  es: { copyLink: "Si el botón no funciona, copia esta dirección en tu navegador:", notification: "Recibes este correo porque tienes una cuenta en Kwanza Flow.", hello: (n) => (n?.trim() ? `¡Hola, ${n.trim()}!` : "¡Hola!") },
};

const ROLE_NAMES: Record<EmailLang, Record<Role, string>> = {
  pt: { OWNER: "Proprietário", MANAGER: "Gestor", STAFF: "Agente" },
  en: { OWNER: "Owner", MANAGER: "Manager", STAFF: "Agent" },
  es: { OWNER: "Propietario", MANAGER: "Gestor", STAFF: "Agente" },
};

// O que cada modelo declara; o resto (moldura, texto simples) é comum.
interface Spec {
  subject: string;
  preheader: string;
  heading: string;
  paragraphs: string[]; // HTML seguro
  cta?: { label: string; url: string };
  footnote?: string; // HTML seguro
  notification?: boolean; // acrescenta «recebeu este e-mail porque tem uma conta»
}

// A moldura comum: cartão, botão, rodapé com a entidade.
function frame(lang: EmailLang, spec: Spec): string {
  const entity = legalEntityFromEnv();
  const phrases = PHRASES[lang];
  const paragraphs = spec.paragraphs.map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151">${p}</p>`).join("");
  const button = spec.cta
    ? `<p style="margin:24px 0"><a href="${esc(spec.cta.url)}" style="display:inline-block;background:#10b981;color:#06281d;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:999px">${esc(spec.cta.label)}</a></p>` +
      `<p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:#6b7280">${phrases.copyLink}<br><span style="word-break:break-all">${esc(spec.cta.url)}</span></p>`
    : "";
  const foot = [spec.footnote, spec.notification ? esc(phrases.notification) : null].filter(Boolean).map((p) => `<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#6b7280">${p}</p>`).join("");
  const sender = [entity.name, entity.address].filter(Boolean).map((v) => esc(v as string)).join(" · ");
  return (
    `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(spec.heading)}</title></head>` +
    `<body style="margin:0;padding:0;background:#f3f4f6"><span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(spec.preheader)}</span>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6"><tr><td align="center" style="padding:32px 16px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px">` +
    `<tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">` +
    `<p style="margin:0 0 24px;font-size:18px;font-weight:700;color:#111827">Kwanza Flow</p>` +
    `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827">${esc(spec.heading)}</h1>` +
    `${paragraphs}${button}${foot}</td></tr></table>` +
    `<p style="max-width:520px;margin:16px auto 0;font-family:-apple-system,Arial,sans-serif;font-size:12px;color:#9ca3af">${sender}</p>` +
    `</td></tr></table></body></html>`
  );
}

function render(lang: EmailLang, spec: Spec): EmailContent {
  const phrases = PHRASES[lang];
  const parts = [spec.heading, ...spec.paragraphs.map(toText), spec.cta ? `${spec.cta.label}: ${spec.cta.url}` : null, spec.footnote ? toText(spec.footnote) : null, spec.notification ? phrases.notification : null];
  return { subject: spec.subject, text: parts.filter(Boolean).join("\n\n"), html: frame(lang, spec) };
}

// Escolhe o texto da língua do destinatário.
const pick = <T>(lang: EmailLang, copy: Record<EmailLang, T>): T => copy[lang];

// ------------------------------------------------------------------------------------------ confirmar o registo
export function confirmSignupEmail(input: { name?: string | null; url: string; lang: EmailLang }): EmailContent {
  const { lang, url } = input;
  const hello = esc(PHRASES[lang].hello(input.name));
  return render(lang, pick(lang, {
    pt: { subject: "Confirme o seu e-mail para ativar a conta Kwanza Flow", preheader: "Confirme o seu e-mail para ativar a conta.", heading: "Confirme o seu e-mail", paragraphs: [hello, "Falta só um passo para ativar a sua conta Kwanza Flow."], cta: { label: "Confirmar e-mail", url }, footnote: "Se não criou uma conta, ignore esta mensagem." },
    en: { subject: "Confirm your email to activate your Kwanza Flow account", preheader: "Confirm your email to activate your account.", heading: "Confirm your email", paragraphs: [hello, "One last step to activate your Kwanza Flow account."], cta: { label: "Confirm email", url }, footnote: "If you didn't create an account, ignore this message." },
    es: { subject: "Confirma tu correo para activar tu cuenta de Kwanza Flow", preheader: "Confirma tu correo para activar la cuenta.", heading: "Confirma tu correo", paragraphs: [hello, "Solo falta un paso para activar tu cuenta de Kwanza Flow."], cta: { label: "Confirmar correo", url }, footnote: "Si no creaste una cuenta, ignora este mensaje." },
  }));
}

// --------------------------------------------------------------------------------------------- boas-vindas
export function welcomeEmail(input: { name?: string | null; dashboardUrl: string; lang: EmailLang }): EmailContent {
  const { lang, dashboardUrl } = input;
  const hello = esc(PHRASES[lang].hello(input.name));
  return render(lang, pick(lang, {
    pt: { subject: "Bem-vindo à Kwanza Flow", preheader: "A sua conta está ativa. Três passos para começar.", heading: "Bem-vindo à Kwanza Flow", paragraphs: [hello, `A sua conta está ativa, com ${b("14 dias grátis")}. Para começar a atender os seus clientes:`, `${b("1.")} Ligue um canal (WhatsApp, Instagram ou Messenger)<br>${b("2.")} Preencha a ficha do negócio<br>${b("3.")} Ligue a IA`], cta: { label: "Abrir o painel", url: dashboardUrl } },
    en: { subject: "Welcome to Kwanza Flow", preheader: "Your account is active. Three steps to get started.", heading: "Welcome to Kwanza Flow", paragraphs: [hello, `Your account is active, with a ${b("14-day free trial")}. To start serving your customers:`, `${b("1.")} Connect a channel (WhatsApp, Instagram or Messenger)<br>${b("2.")} Fill in your business profile<br>${b("3.")} Turn on the AI`], cta: { label: "Open the dashboard", url: dashboardUrl } },
    es: { subject: "Te damos la bienvenida a Kwanza Flow", preheader: "Tu cuenta está activa. Tres pasos para empezar.", heading: "Te damos la bienvenida a Kwanza Flow", paragraphs: [hello, `Tu cuenta está activa, con ${b("14 días gratis")}. Para empezar a atender a tus clientes:`, `${b("1.")} Conecta un canal (WhatsApp, Instagram o Messenger)<br>${b("2.")} Completa la ficha del negocio<br>${b("3.")} Activa la IA`], cta: { label: "Abrir el panel", url: dashboardUrl } },
  }));
}

// ------------------------------------------------------------------------------- recuperar a palavra-passe
export function passwordResetEmail(input: { url: string; lang: EmailLang }): EmailContent {
  const { lang, url } = input;
  return render(lang, pick(lang, {
    pt: { subject: "Redefinir a palavra-passe da Kwanza Flow", preheader: "Escolha uma nova palavra-passe.", heading: "Redefinir a palavra-passe", paragraphs: ["Recebemos um pedido para redefinir a palavra-passe da sua conta Kwanza Flow."], cta: { label: "Escolher nova palavra-passe", url }, footnote: "O link é de uso único e expira em breve. Se não foi você, ignore esta mensagem: a sua palavra-passe não muda." },
    en: { subject: "Reset your Kwanza Flow password", preheader: "Choose a new password.", heading: "Reset your password", paragraphs: ["We received a request to reset the password of your Kwanza Flow account."], cta: { label: "Choose a new password", url }, footnote: "The link is single-use and expires soon. If it wasn't you, ignore this message: your password won't change." },
    es: { subject: "Restablece tu contraseña de Kwanza Flow", preheader: "Elige una contraseña nueva.", heading: "Restablecer la contraseña", paragraphs: ["Recibimos una solicitud para restablecer la contraseña de tu cuenta de Kwanza Flow."], cta: { label: "Elegir una contraseña nueva", url }, footnote: "El enlace es de un solo uso y caduca pronto. Si no fuiste tú, ignora este mensaje: tu contraseña no cambia." },
  }));
}

// ---------------------------------------------------------------------------------------------------- convite
export function inviteEmail(input: { workspaceName: string; inviterName: string; role: Role; url: string; lang?: EmailLang }): EmailContent {
  const lang = input.lang ?? "pt";
  const role = ROLE_NAMES[lang][input.role];
  const org = input.workspaceName;
  const who = input.inviterName;
  return render(lang, pick(lang, {
    pt: { subject: `${who} convidou-o para a equipa ${org} na Kwanza Flow`, preheader: `${who} convidou-o para a equipa ${org}.`, heading: "Foi convidado para uma equipa", paragraphs: [`${b(who)} convidou-o para a equipa ${b(org)} na Kwanza Flow, com o papel de ${b(role)}.`], cta: { label: "Aceitar o convite", url: input.url }, footnote: "O link é válido por 7 dias. Se não estava à espera deste convite, ignore esta mensagem." },
    en: { subject: `${who} invited you to the ${org} team on Kwanza Flow`, preheader: `${who} invited you to the ${org} team.`, heading: "You've been invited to a team", paragraphs: [`${b(who)} invited you to the ${b(org)} team on Kwanza Flow, as ${b(role)}.`], cta: { label: "Accept the invitation", url: input.url }, footnote: "The link is valid for 7 days. If you weren't expecting this invitation, ignore this message." },
    es: { subject: `${who} te invitó al equipo ${org} en Kwanza Flow`, preheader: `${who} te invitó al equipo ${org}.`, heading: "Te invitaron a un equipo", paragraphs: [`${b(who)} te invitó al equipo ${b(org)} en Kwanza Flow, con el rol de ${b(role)}.`], cta: { label: "Aceptar la invitación", url: input.url }, footnote: "El enlace es válido durante 7 días. Si no esperabas esta invitación, ignora este mensaje." },
  }));
}

// -------------------------------------------------------------------------------- conta recebida (por aprovar)
export function pendingReviewEmail(input: { name?: string | null; lang: EmailLang }): EmailContent {
  const { lang } = input;
  const hello = esc(PHRASES[lang].hello(input.name));
  return render(lang, pick(lang, {
    pt: { subject: "Recebemos o seu registo na Kwanza Flow", preheader: "O seu registo está a ser revisto pela nossa equipa.", heading: "Recebemos o seu registo", paragraphs: [hello, `Obrigado por se registar na Kwanza Flow. A nossa equipa está a ${b("rever a sua conta")} antes de a ativar.`, `Não precisa de fazer nada. Receberá um novo e-mail assim que a conta for ${b("aprovada")}, e o seu teste gratuito de 14 dias começa nessa altura.`], footnote: "Se não foi você que criou esta conta, ignore esta mensagem." },
    en: { subject: "We received your Kwanza Flow sign-up", preheader: "Our team is reviewing your sign-up.", heading: "We received your sign-up", paragraphs: [hello, `Thank you for signing up for Kwanza Flow. Our team is ${b("reviewing your account")} before activating it.`, `You don't need to do anything. You will get another email as soon as the account is ${b("approved")}, and your 14-day free trial starts then.`], footnote: "If you didn't create this account, ignore this message." },
    es: { subject: "Recibimos tu registro en Kwanza Flow", preheader: "Nuestro equipo está revisando tu registro.", heading: "Recibimos tu registro", paragraphs: [hello, `Gracias por registrarte en Kwanza Flow. Nuestro equipo está ${b("revisando tu cuenta")} antes de activarla.`, `No necesitas hacer nada. Recibirás otro correo en cuanto la cuenta sea ${b("aprobada")}, y tu prueba gratuita de 14 días empezará en ese momento.`], footnote: "Si no creaste esta cuenta, ignora este mensaje." },
  }));
}

// ------------------------------------------------------------------------------------------ conta aprovada
export function accountApprovedEmail(input: { name?: string | null; loginUrl: string; lang: EmailLang }): EmailContent {
  const { lang, loginUrl } = input;
  const hello = esc(PHRASES[lang].hello(input.name));
  return render(lang, pick(lang, {
    pt: { subject: "A sua conta Kwanza Flow foi aprovada", preheader: "A sua conta está ativa e o teste de 14 dias já começou.", heading: "A sua conta foi aprovada", paragraphs: [hello, `Boas notícias: a sua conta Kwanza Flow está ${b("ativa")}. O seu ${b("teste gratuito de 14 dias começou hoje")}, sem cartão.`, `Entre, ligue o seu WhatsApp e crie a sua primeira campanha ou automação.`], cta: { label: "Entrar na Kwanza Flow", url: loginUrl }, notification: true },
    en: { subject: "Your Kwanza Flow account was approved", preheader: "Your account is active and your 14-day trial has started.", heading: "Your account was approved", paragraphs: [hello, `Good news: your Kwanza Flow account is ${b("active")}. Your ${b("14-day free trial started today")}, no card needed.`, `Sign in, connect your WhatsApp and create your first campaign or automation.`], cta: { label: "Sign in to Kwanza Flow", url: loginUrl }, notification: true },
    es: { subject: "Tu cuenta de Kwanza Flow fue aprobada", preheader: "Tu cuenta está activa y tu prueba de 14 días ya empezó.", heading: "Tu cuenta fue aprobada", paragraphs: [hello, `Buenas noticias: tu cuenta de Kwanza Flow está ${b("activa")}. Tu ${b("prueba gratuita de 14 días empezó hoy")}, sin tarjeta.`, `Entra, conecta tu WhatsApp y crea tu primera campaña o automatización.`], cta: { label: "Entrar en Kwanza Flow", url: loginUrl }, notification: true },
  }));
}

// ------------------------------------------------------------------------------------- conta não aprovada
export function accountRejectedEmail(input: { name?: string | null; reason: string; supportEmail?: string | null; lang: EmailLang }): EmailContent {
  const { lang } = input;
  const hello = esc(PHRASES[lang].hello(input.name));
  const reason = esc(input.reason).replace(/\n/g, "<br>");
  const support = input.supportEmail?.trim();
  return render(lang, pick(lang, {
    pt: { subject: "Sobre o seu registo na Kwanza Flow", preheader: "Não foi possível aprovar o seu registo.", heading: "Não foi possível aprovar o seu registo", paragraphs: [hello, "Obrigado pelo interesse na Kwanza Flow. Depois de analisar o seu registo, não o conseguimos aprovar neste momento.", `${b("Motivo indicado pela nossa equipa:")}<br>${reason}`, support ? `Se acha que se trata de um engano, ou se pode esclarecer a situação, responda a este e-mail ou escreva-nos para ${b(support)}. Teremos todo o gosto em rever a sua conta.` : "Se acha que se trata de um engano, responda a este e-mail e teremos todo o gosto em rever a sua conta."], notification: true },
    en: { subject: "About your Kwanza Flow sign-up", preheader: "We couldn't approve your sign-up.", heading: "We couldn't approve your sign-up", paragraphs: [hello, "Thank you for your interest in Kwanza Flow. After reviewing your sign-up, we are unable to approve it at this time.", `${b("Reason given by our team:")}<br>${reason}`, support ? `If you think this is a mistake, or you can clarify the situation, reply to this email or write to ${b(support)}. We will gladly review your account.` : "If you think this is a mistake, reply to this email and we will gladly review your account."], notification: true },
    es: { subject: "Sobre tu registro en Kwanza Flow", preheader: "No pudimos aprobar tu registro.", heading: "No pudimos aprobar tu registro", paragraphs: [hello, "Gracias por tu interés en Kwanza Flow. Tras revisar tu registro, no hemos podido aprobarlo en este momento.", `${b("Motivo indicado por nuestro equipo:")}<br>${reason}`, support ? `Si crees que se trata de un error, o puedes aclarar la situación, responde a este correo o escríbenos a ${b(support)}. Con gusto revisaremos tu cuenta.` : "Si crees que se trata de un error, responde a este correo y con gusto revisaremos tu cuenta."], notification: true },
  }));
}

// -------------------------------------------------------------------- aviso: o teste / a subscrição termina em breve
export type EndingKind = "trial" | "subscription";
export function endingSoonEmail(input: { name?: string | null; orgName: string; kind: EndingKind; daysLeft: number; endsAt: Date; billingUrl: string; lang: EmailLang }): EmailContent {
  const { lang, kind, daysLeft } = input;
  const hello = esc(PHRASES[lang].hello(input.name));
  const date = formatDate(input.endsAt, lang);
  const org = input.orgName;
  const days = Math.max(1, daysLeft);
  const copy = {
    pt: { d: days === 1 ? "1 dia" : `${days} dias` },
    en: { d: days === 1 ? "1 day" : `${days} days` },
    es: { d: days === 1 ? "1 día" : `${days} días` },
  }[lang];
  if (kind === "trial") {
    return render(lang, pick(lang, {
      pt: { subject: `O teste grátis de ${org} termina em ${copy.d}`, preheader: `O seu teste termina a ${date}.`, heading: `O seu teste termina em ${copy.d}`, paragraphs: [hello, `O teste gratuito de ${b(org)} na Kwanza Flow termina a ${b(date)}.`, "Para continuar a usar a Inbox, as campanhas, as automações e a IA sem interrupções, ative o seu plano antes dessa data. Depois do fim do teste, o acesso fica bloqueado até subscrever (os seus dados ficam guardados)."], cta: { label: "Ativar o plano", url: input.billingUrl }, notification: true },
      en: { subject: `The free trial of ${org} ends in ${copy.d}`, preheader: `Your trial ends on ${date}.`, heading: `Your trial ends in ${copy.d}`, paragraphs: [hello, `The free trial of ${b(org)} on Kwanza Flow ends on ${b(date)}.`, "To keep using the Inbox, campaigns, automations and the AI without interruption, activate your plan before then. After the trial ends, access is blocked until you subscribe (your data is kept)."], cta: { label: "Activate the plan", url: input.billingUrl }, notification: true },
      es: { subject: `La prueba gratuita de ${org} termina en ${copy.d}`, preheader: `Tu prueba termina el ${date}.`, heading: `Tu prueba termina en ${copy.d}`, paragraphs: [hello, `La prueba gratuita de ${b(org)} en Kwanza Flow termina el ${b(date)}.`, "Para seguir usando la Inbox, las campañas, las automatizaciones y la IA sin interrupciones, activa tu plan antes de esa fecha. Cuando termine la prueba, el acceso se bloquea hasta que te suscribas (tus datos se conservan)."], cta: { label: "Activar el plan", url: input.billingUrl }, notification: true },
    }));
  }
  return render(lang, pick(lang, {
    pt: { subject: `A subscrição de ${org} termina em ${copy.d}`, preheader: `O acesso termina a ${date}.`, heading: `A sua subscrição termina em ${copy.d}`, paragraphs: [hello, `A subscrição de ${b(org)} na Kwanza Flow está cancelada e o acesso termina a ${b(date)}.`, "Se quiser continuar, pode reativá-la antes dessa data na página de faturação, sem perder nada."], cta: { label: "Gerir a subscrição", url: input.billingUrl }, notification: true },
    en: { subject: `The subscription of ${org} ends in ${copy.d}`, preheader: `Access ends on ${date}.`, heading: `Your subscription ends in ${copy.d}`, paragraphs: [hello, `The subscription of ${b(org)} on Kwanza Flow is cancelled and access ends on ${b(date)}.`, "If you want to continue, you can reactivate it before then on the billing page, without losing anything."], cta: { label: "Manage the subscription", url: input.billingUrl }, notification: true },
    es: { subject: `La suscripción de ${org} termina en ${copy.d}`, preheader: `El acceso termina el ${date}.`, heading: `Tu suscripción termina en ${copy.d}`, paragraphs: [hello, `La suscripción de ${b(org)} en Kwanza Flow está cancelada y el acceso termina el ${b(date)}.`, "Si quieres continuar, puedes reactivarla antes de esa fecha en la página de facturación, sin perder nada."], cta: { label: "Gestionar la suscripción", url: input.billingUrl }, notification: true },
  }));
}

// ------------------------------------------------------------------------------------ subscrição renovada
// `amountLabel`: o valor cobrado (do recibo do Stripe); `priceLabel`: o preço do plano, se não houver recibo ainda.
export function subscriptionRenewedEmail(input: { name?: string | null; orgName: string; plan: string | null; renewedUntil: Date; priceLabel?: string | null; amountLabel?: string | null; receiptUrl?: string | null; billingUrl: string; lang: EmailLang }): EmailContent {
  const { lang } = input;
  const hello = esc(PHRASES[lang].hello(input.name));
  const until = formatDate(input.renewedUntil, lang);
  const plan = input.plan?.trim() || "Kwanza Flow";
  const price = input.amountLabel?.trim() || input.priceLabel?.trim();
  const receiptLabel = { pt: "Recibo", en: "Receipt", es: "Recibo" }[lang];
  const receipt = input.receiptUrl ? [`${esc(receiptLabel)}: <a href="${esc(input.receiptUrl)}" style="color:#059669">${esc(input.receiptUrl)}</a>`] : [];
  const details = {
    pt: [["Organização", input.orgName], ["Plano", plan], ...(price ? [["Valor", price]] : []), ["Próxima renovação", until]],
    en: [["Organisation", input.orgName], ["Plan", plan], ...(price ? [["Amount", price]] : []), ["Next renewal", until]],
    es: [["Organización", input.orgName], ["Plan", plan], ...(price ? [["Importe", price]] : []), ["Próxima renovación", until]],
  }[lang].map(([label, value]) => `${esc(label)}: ${b(value)}`).join("<br>");
  return render(lang, pick(lang, {
    pt: { subject: "Subscrição Kwanza Flow renovada com sucesso", preheader: `Renovada até ${until}.`, heading: "A sua subscrição foi renovada", paragraphs: [hello, "Recebemos o pagamento e a sua subscrição foi renovada. Obrigado pela confiança!", details, ...receipt], cta: { label: "Ver faturação", url: input.billingUrl }, footnote: "As faturas ficam disponíveis no portal de faturação.", notification: true },
    en: { subject: "Kwanza Flow subscription renewed successfully", preheader: `Renewed until ${until}.`, heading: "Your subscription was renewed", paragraphs: [hello, "We received the payment and your subscription has been renewed. Thank you for your trust!", details, ...receipt], cta: { label: "View billing", url: input.billingUrl }, footnote: "Invoices are available in the billing portal.", notification: true },
    es: { subject: "Suscripción de Kwanza Flow renovada con éxito", preheader: `Renovada hasta el ${until}.`, heading: "Tu suscripción fue renovada", paragraphs: [hello, "Recibimos el pago y tu suscripción fue renovada. ¡Gracias por tu confianza!", details, ...receipt], cta: { label: "Ver facturación", url: input.billingUrl }, footnote: "Las facturas están disponibles en el portal de facturación.", notification: true },
  }));
}

// ------------------------------------------------------------------- manutenção programada e avisos do sistema
export type NoticeKind = "maintenance" | "notice";
export interface NoticeText {
  subject: string;
  body: string;
}
// O administrador escreve o texto (uma versão por língua); aqui só se escapa e se dá a moldura. A janela de uma
// manutenção, se existir, aparece formatada na língua de quem lê.
export function systemNoticeEmail(input: { name?: string | null; kind: NoticeKind; text: NoticeText; startsAt?: Date | null; endsAt?: Date | null; lang: EmailLang }): EmailContent {
  const { lang, kind, text } = input;
  const hello = esc(PHRASES[lang].hello(input.name));
  const body = text.body
    .split(/\n{2,}/)
    .map((paragraph) => esc(paragraph.trim()).replace(/\n/g, "<br>"))
    .filter(Boolean);
  const labels = {
    pt: { maintenance: "Manutenção programada", notice: "Aviso importante", when: "Quando", from: "de", to: "até", reason: "Durante a intervenção, alguns serviços podem estar indisponíveis por breves momentos." },
    en: { maintenance: "Scheduled maintenance", notice: "Important notice", when: "When", from: "from", to: "to", reason: "During the work, some services may be briefly unavailable." },
    es: { maintenance: "Mantenimiento programado", notice: "Aviso importante", when: "Cuándo", from: "de", to: "hasta", reason: "Durante la intervención, algunos servicios pueden no estar disponibles por breves momentos." },
  }[lang];
  const window = input.startsAt ? `${esc(labels.when)}: ${b(`${labels.from} ${formatDate(input.startsAt, lang, true)}${input.endsAt ? ` ${labels.to} ${formatDate(input.endsAt, lang, true)}` : ""}`)}` : null;
  return render(lang, {
    subject: text.subject,
    preheader: text.body.replace(/\s+/g, " ").slice(0, 110),
    heading: kind === "maintenance" ? labels.maintenance : labels.notice,
    paragraphs: [hello, `${b(text.subject)}`, ...body, ...(window ? [window] : []), ...(kind === "maintenance" ? [esc(labels.reason)] : [])],
    notification: true,
  });
}
