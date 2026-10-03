import "server-only";
import { Prisma } from "@prisma/client";
import { emailConfigured, sendEmail } from "@/lib/email/send";
import { renderNotification, type NotificationKind } from "@/lib/email/notifications";
import { emailLang } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";

// O motor dos e-mails de notificação. Cada e-mail é uma linha (EmailNotification): primeiro REGISTA-SE (a chave
// única impede o mesmo aviso de sair duas vezes) e depois ENVIA-SE. Se o envio falhar, a linha fica pendente e o
// cron volta a tentar (até 4 vezes). Nada daqui lança erros: um e-mail que falha nunca parte o fluxo principal
// (o registo, a aprovação, o webhook do Stripe...).

export const MAX_ATTEMPTS = 4;

export interface QueueInput {
  kind: NotificationKind;
  dedupeKey: string;
  to: string;
  locale?: string | null;
  workspaceId?: string | null;
  payload: Prisma.InputJsonValue;
  noticeId?: string | null;
  // Não enviar antes desta hora (só se regista; o cron envia quando chegar).
  notBefore?: Date | null;
}

// Regista o e-mail. Devolve o id, ou null se este aviso já existia para este destinatário.
export async function queueNotification(input: QueueInput): Promise<string | null> {
  try {
    const row = await prisma.emailNotification.create({
      data: { kind: input.kind, dedupeKey: input.dedupeKey, toEmail: input.to.trim().toLowerCase(), locale: emailLang(input.locale), workspaceId: input.workspaceId ?? null, payload: input.payload, noticeId: input.noticeId ?? null, notBefore: input.notBefore ?? null },
      select: { id: true },
    });
    return row.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return null;
    throw err;
  }
}

export type DeliveryResult = "sent" | "retry" | "failed" | "skipped" | "not_configured";

// Envia um e-mail registado. Reivindica a tentativa de forma atómica: dois workers nunca enviam o mesmo.
export async function deliverNotification(id: string): Promise<DeliveryResult> {
  try {
    if (!emailConfigured()) return "not_configured"; // fica pendente até o Resend estar configurado
    const row = await prisma.emailNotification.findUnique({ where: { id } });
    if (!row || row.status !== "PENDING") return "skipped";

    const claimed = await prisma.emailNotification.updateMany({ where: { id, status: "PENDING", attempts: row.attempts }, data: { attempts: row.attempts + 1 } });
    if (claimed.count !== 1) return "skipped";

    const rendered = renderNotification(row.kind, row.payload, emailLang(row.locale));
    if (!rendered.ok) {
      await prisma.emailNotification.update({ where: { id }, data: { status: "FAILED", lastError: rendered.error } });
      return "failed";
    }

    const result = await sendEmail({ to: row.toEmail, ...rendered.email, idempotencyKey: `notification-${row.id}` });
    if (result.ok) {
      await prisma.emailNotification.update({ where: { id }, data: { status: "SENT", sentAt: new Date(), lastError: null } });
      return "sent";
    }
    const exhausted = row.attempts + 1 >= MAX_ATTEMPTS;
    await prisma.emailNotification.update({ where: { id }, data: { status: exhausted ? "FAILED" : "PENDING", lastError: result.error.slice(0, 200) } });
    return exhausted ? "failed" : "retry";
  } catch (err) {
    console.error("[email] falha ao enviar", id, err);
    return "retry";
  }
}

// Regista e envia, sem nunca lançar. Para usar dentro de `after(...)`.
export async function notify(input: QueueInput): Promise<DeliveryResult | "duplicate"> {
  try {
    const id = await queueNotification(input);
    if (!id) return "duplicate";
    return await deliverNotification(id);
  } catch (err) {
    console.error("[email] falha ao registar", input.kind, err);
    return "retry";
  }
}

export interface PendingSummary {
  tried: number;
  sent: number;
  failed: number;
}

// O que o cron faz: tenta os e-mails que ficaram pendentes (envio falhado, Resend por configurar, aviso grande).
export async function processPendingEmails(limit = 40, deadlineAt?: number): Promise<PendingSummary> {
  const summary: PendingSummary = { tried: 0, sent: 0, failed: 0 };
  if (!emailConfigured()) return summary;
  const rows = await prisma.emailNotification.findMany({ where: { status: "PENDING", attempts: { lt: MAX_ATTEMPTS }, OR: [{ notBefore: null }, { notBefore: { lte: new Date() } }] }, orderBy: { createdAt: "asc" }, take: limit, select: { id: true } });
  for (const row of rows) {
    if (deadlineAt !== undefined && Date.now() >= deadlineAt) break;
    const result = await deliverNotification(row.id);
    if (result === "skipped") continue;
    summary.tried++;
    if (result === "sent") summary.sent++;
    if (result === "failed") summary.failed++;
  }
  return summary;
}

export interface Recipient {
  email: string;
  name: string | null;
  locale: string | null;
}

// A quem escrever numa organização: os proprietários (com a sua língua). Sem nenhum, o e-mail do dono guardado.
export async function ownerRecipients(workspaceId: string): Promise<Recipient[]> {
  const owners = await prisma.user.findMany({ where: { workspaceId, role: "OWNER" }, select: { email: true, name: true, locale: true } });
  if (owners.length > 0) return owners;
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { ownerEmail: true } });
  return workspace?.ownerEmail ? [{ email: workspace.ownerEmail, name: null, locale: null }] : [];
}

// Regista e envia; se o mesmo e-mail já estava registado e ainda PENDENTE (à espera da sua hora), atualiza-o com
// os dados novos (mais completos) e envia já. Se já saiu ou falhou de vez, não faz nada. Nunca lança.
export async function notifyOrUpgrade(input: QueueInput): Promise<DeliveryResult | "duplicate"> {
  try {
    const id = await queueNotification({ ...input, notBefore: null });
    if (id) return await deliverNotification(id);
    const existing = await prisma.emailNotification.findUnique({ where: { kind_dedupeKey_toEmail: { kind: input.kind, dedupeKey: input.dedupeKey, toEmail: input.to.trim().toLowerCase() } }, select: { id: true, status: true } });
    if (!existing || existing.status !== "PENDING") return "duplicate";
    await prisma.emailNotification.update({ where: { id: existing.id }, data: { payload: input.payload, notBefore: null } });
    return await deliverNotification(existing.id);
  } catch (err) {
    console.error("[email] falha ao atualizar/enviar", input.kind, err);
    return "retry";
  }
}
