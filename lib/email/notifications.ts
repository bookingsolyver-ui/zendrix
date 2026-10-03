// Os e-mails de notificação como DADOS: cada tipo tem um payload simples (texto, números, datas em ISO) que se
// guarda na base de dados e, no envio, vira o e-mail na língua do destinatário. Puro (sem servidor).
import { z } from "zod";
import {
  accountApprovedEmail,
  accountRejectedEmail,
  endingSoonEmail,
  pendingReviewEmail,
  subscriptionRenewedEmail,
  systemNoticeEmail,
  type EmailContent,
  type EmailLang,
} from "./templates.ts";

export const NOTIFICATION_KINDS = ["pending_review", "account_approved", "account_rejected", "ending_soon", "subscription_renewed", "system_notice"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

const name = z.string().max(120).nullish();
const isoDate = z.string().datetime();
// Só endereços http(s): um «javascript:» ou «data:» nunca pode ir para o botão de um e-mail.
const httpUrl = z.string().url().refine((value) => /^https?:\/\//i.test(value), "invalid_url");
const noticeText = z.object({ subject: z.string().min(1).max(150), body: z.string().min(1).max(5000) });

export const payloadSchemas = {
  pending_review: z.object({ name }),
  account_approved: z.object({ name, loginUrl: httpUrl }),
  account_rejected: z.object({ name, reason: z.string().min(1).max(300), supportEmail: z.string().max(254).nullish() }),
  ending_soon: z.object({ name, orgName: z.string().min(1).max(120), kind: z.enum(["trial", "subscription"]), endsAt: isoDate, billingUrl: httpUrl }),
  subscription_renewed: z.object({ name, orgName: z.string().min(1).max(120), plan: z.string().max(80).nullish(), renewedUntil: isoDate, priceLabel: z.string().max(60).nullish(), billingUrl: httpUrl }),
  system_notice: z.object({
    name,
    kind: z.enum(["maintenance", "notice"]),
    // Uma versão por língua; o português é obrigatório e as outras caem nele se faltarem.
    content: z.object({ pt: noticeText, en: noticeText.optional(), es: noticeText.optional() }),
    startsAt: isoDate.nullish(),
    endsAt: isoDate.nullish(),
  }),
} as const;

export const DAY_MS = 86_400_000;
export const ENDING_SOON_DAYS = 5;

// Dias que faltam (arredondados para cima, mínimo 1): «termina amanhã» = 1, «termina hoje à noite» = 1.
export const daysUntil = (date: Date, now: Date) => Math.max(1, Math.ceil((date.getTime() - now.getTime()) / DAY_MS));

// Está dentro da janela do aviso (futuro, a 5 dias ou menos)?
export const isEndingSoon = (date: Date | null, now: Date, days = ENDING_SOON_DAYS) => date !== null && date.getTime() > now.getTime() && date.getTime() - now.getTime() <= days * DAY_MS;

// O que o e-mail «termina em breve» fica a dever ao dia: um aviso por fim de período (chave = o dia do fim).
export const endingDedupeKey = (kind: "trial" | "subscription", endsAt: Date) => `${kind}:${endsAt.toISOString().slice(0, 10)}`;

// A renovação: o período pago avançou, e não foi uma repetição do mesmo evento nem a primeira ativação.
export function isRenewal(previousPeriodEnd: Date | null, nextPeriodEnd: Date | null): boolean {
  return previousPeriodEnd !== null && nextPeriodEnd !== null && nextPeriodEnd.getTime() - previousPeriodEnd.getTime() > DAY_MS;
}

export type RenderResult = { ok: true; email: EmailContent } | { ok: false; error: "invalid_payload" | "unknown_kind" };

// Dados -> e-mail. Se o payload estiver corrompido não rebenta: devolve o erro e o envio fica FAILED.
export function renderNotification(kind: string, payload: unknown, lang: EmailLang, now = new Date()): RenderResult {
  if (!(NOTIFICATION_KINDS as readonly string[]).includes(kind)) return { ok: false, error: "unknown_kind" };
  const k = kind as NotificationKind;
  const parsed = payloadSchemas[k].safeParse(payload);
  if (!parsed.success) return { ok: false, error: "invalid_payload" };
  const data = parsed.data as never as Record<string, unknown> & { name?: string | null };

  switch (k) {
    case "pending_review":
      return { ok: true, email: pendingReviewEmail({ name: data.name, lang }) };
    case "account_approved": {
      const d = data as z.infer<typeof payloadSchemas.account_approved>;
      return { ok: true, email: accountApprovedEmail({ name: d.name, loginUrl: d.loginUrl, lang }) };
    }
    case "account_rejected": {
      const d = data as z.infer<typeof payloadSchemas.account_rejected>;
      return { ok: true, email: accountRejectedEmail({ name: d.name, reason: d.reason, supportEmail: d.supportEmail, lang }) };
    }
    case "ending_soon": {
      const d = data as z.infer<typeof payloadSchemas.ending_soon>;
      const endsAt = new Date(d.endsAt);
      return { ok: true, email: endingSoonEmail({ name: d.name, orgName: d.orgName, kind: d.kind, daysLeft: daysUntil(endsAt, now), endsAt, billingUrl: d.billingUrl, lang }) };
    }
    case "subscription_renewed": {
      const d = data as z.infer<typeof payloadSchemas.subscription_renewed>;
      return { ok: true, email: subscriptionRenewedEmail({ name: d.name, orgName: d.orgName, plan: d.plan ?? null, renewedUntil: new Date(d.renewedUntil), priceLabel: d.priceLabel, billingUrl: d.billingUrl, lang }) };
    }
    case "system_notice": {
      const d = data as z.infer<typeof payloadSchemas.system_notice>;
      // Sem versão na língua do destinatário, o e-mail INTEIRO sai em português (texto, títulos e datas): nada de
      // misturar línguas no mesmo e-mail.
      const lang2 = d.content[lang] ? lang : "pt";
      return { ok: true, email: systemNoticeEmail({ name: d.name, kind: d.kind, text: d.content[lang2]!, startsAt: d.startsAt ? new Date(d.startsAt) : null, endsAt: d.endsAt ? new Date(d.endsAt) : null, lang: lang2 }) };
    }
  }
}
