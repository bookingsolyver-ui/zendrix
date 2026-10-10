import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuditLedger, type AuditContext } from "@/lib/audit/ledger";
import { NotificationService } from "@/lib/alerts/notification-service";
import { handoffSince, HandoffEngine } from "@/lib/handoff/engine";
import type { Stage } from "@/lib/handoff/state-machine";
import { appBaseUrl } from "@/lib/http/public-url";
import { contactLabel } from "@/lib/inbox/display";
import { enqueueText } from "@/lib/outbox/enqueue";
import { drainOutbox } from "@/lib/outbox/process";
import { isApprovable, MAX_TOTAL_MINOR, totalOf, type ProposalLine } from "@/lib/portal/lines";
import { generatePortalToken, hashPortalToken, PORTAL_TTL_MS } from "@/lib/portal/token";
import { formatMoney } from "@/lib/cash/dunning";

// KWANZA FLOW PORTAL: o cliente do nosso cliente abre um link no telemóvel, vê a proposta e aprova com um toque. Sem PDFs.
//
// Segurança: token de 256 bits, só o hash fica na base de dados; 7 dias de validade; ver é livre (os pré-visualizadores do
// WhatsApp e os antivírus abrem links e NÃO podem consumi-lo); APROVAR é um POST explícito e só acontece uma vez (reivindicação
// atómica). Para qualquer link inexistente, expirado ou revogado a resposta é a mesma («inválido»).
//
// Aprovar = o negócio passa a «Ganho» (Contact.leadStage = WON), por decisão do produto. Atenção: no resto do Kwanza Flow o WON só
// vinha de um pagamento confirmado; aqui vem de uma aprovação de orçamento. O Handoff (tarefas Financeiro/Logística) só arranca
// se HANDOFF_SINCE estiver definido.

export const portalUrl = (token: string, locale = "pt") => `${appBaseUrl()}/${locale}/portal/${token}`;

export type WhatsAppDelivery = "not_requested" | "sent" | "no_conversation" | "window_closed" | "failed";

export const ProposalService = {
  async create(ctx: AuditContext & { workspaceId: string }, input: { contactId: string; title: string; currency: string; lines: ProposalLine[]; sendWhatsApp?: boolean; createdById?: string | null }) {
    const { workspaceId } = ctx;
    const contact = await prisma.contact.findFirst({ where: { id: input.contactId, workspaceId }, select: { id: true, name: true, waId: true, platform: true } });
    if (!contact) return { ok: false as const, error: "not_found" };
    const amountMinor = totalOf(input.lines); // sempre recalculado aqui
    if (amountMinor <= 0 || amountMinor > MAX_TOTAL_MINOR) return { ok: false as const, error: "invalid_total" };

    const token = generatePortalToken();
    const proposal = await prisma.proposal.create({ data: { workspaceId, contactId: contact.id, title: input.title, lines: input.lines as unknown as Prisma.InputJsonValue, amountMinor, currency: input.currency, tokenHash: hashPortalToken(token), tokenExpiresAt: new Date(Date.now() + PORTAL_TTL_MS), createdById: input.createdById ?? null } });
    await AuditLedger.record(ctx, { entityType: "Proposal", entityId: proposal.id, action: "CREATE" }, { next: proposal }, "sync"); // o hash do token é redigido
    const url = portalUrl(token);
    return { ok: true as const, id: proposal.id, url, whatsapp: input.sendWhatsApp ? await this.sendLink(workspaceId, contact, input.title, amountMinor, input.currency, url) : ("not_requested" as WhatsAppDelivery) };
  },

  // Gera um link novo (o anterior deixa de funcionar) e renova os 7 dias. Só para propostas ainda por aprovar.
  async rotate(ctx: AuditContext & { workspaceId: string }, proposalId: string, sendWhatsApp = false) {
    const { workspaceId } = ctx;
    const token = generatePortalToken();
    const updated = await prisma.proposal.updateMany({ where: { id: proposalId, workspaceId, status: "SENT" }, data: { tokenHash: hashPortalToken(token), tokenExpiresAt: new Date(Date.now() + PORTAL_TTL_MS) } });
    if (updated.count === 0) return { ok: false as const, error: "not_found" };
    await AuditLedger.record(ctx, { entityType: "Proposal", entityId: proposalId, action: "UPDATE" }, { next: { event: "link_rotated" } }, "sync");
    const url = portalUrl(token);
    let whatsapp: WhatsAppDelivery = "not_requested";
    if (sendWhatsApp) {
      const proposal = await prisma.proposal.findUnique({ where: { id: proposalId }, select: { contactId: true, title: true, amountMinor: true, currency: true } });
      const contact = proposal && (await prisma.contact.findFirst({ where: { id: proposal.contactId, workspaceId }, select: { id: true, name: true, waId: true, platform: true } }));
      if (proposal && contact) whatsapp = await this.sendLink(workspaceId, contact, proposal.title, proposal.amountMinor, proposal.currency, url);
    }
    return { ok: true as const, url, whatsapp };
  },

  // Tenta enviar o link por WhatsApp. Só se pode escrever dentro da janela de 24 h do cliente; senão devolve o motivo e o
  // gestor copia o link e envia à mão.
  async sendLink(workspaceId: string, contact: { id: string; name: string | null; waId: string; platform: "WHATSAPP" | "INSTAGRAM" | "MESSENGER" }, title: string, amountMinor: number, currency: string, url: string): Promise<WhatsAppDelivery> {
    const conversation = await prisma.conversation.findFirst({ where: { workspaceId, contactId: contact.id }, select: { id: true } });
    if (!conversation) return "no_conversation";
    const first = contactLabel(contact.name, contact.waId, contact.platform).split(" ")[0];
    const result = await enqueueText({ workspaceId, conversationId: conversation.id, text: `Olá ${first}! Preparámos a proposta «${title}» (${formatMoney(amountMinor, currency)}). Veja os detalhes e aprove aqui, com um toque: ${url} (válido durante 7 dias)` });
    if (result.ok) {
      await drainOutbox(4_000);
      return "sent";
    }
    return result.error === "window_closed" ? "window_closed" : "failed";
  },

  async list(workspaceId: string) {
    const rows = await prisma.proposal.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, contactId: true, title: true, amountMinor: true, currency: true, status: true, tokenExpiresAt: true, approvedAt: true, createdAt: true } });
    return rows;
  },

  // O que a página pública mostra. Nunca devolve dados de outros clientes nem ids internos.
  async getForPortal(token: string, now = new Date()) {
    const proposal = await prisma.proposal.findUnique({ where: { tokenHash: hashPortalToken(token) } });
    if (!proposal || proposal.status === "REVOKED") return null;
    if (proposal.status === "SENT" && !isApprovable(proposal, now)) return null; // expirada: igual a inexistente
    const [workspace, contact] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: proposal.workspaceId }, select: { name: true, blockedAt: true, approvalStatus: true } }),
      prisma.contact.findFirst({ where: { id: proposal.contactId, workspaceId: proposal.workspaceId }, select: { name: true, waId: true, platform: true } }),
    ]);
    if (!workspace || workspace.blockedAt || workspace.approvalStatus !== "APPROVED") return null;
    return {
      business: workspace.name,
      customer: contact ? contactLabel(contact.name, contact.waId, contact.platform).split(" ")[0] : null,
      title: proposal.title,
      lines: proposal.lines as unknown as ProposalLine[],
      amountMinor: proposal.amountMinor,
      currency: proposal.currency,
      approved: proposal.status === "APPROVED",
      expiresAt: proposal.tokenExpiresAt.toISOString(),
    };
  },

  // O clique em «Aprovar». Reivindicação atómica (só uma vez, só dentro do prazo) e a mudança para «Ganho» na MESMA transação.
  async approve(token: string, who: { ip: string; userAgent: string | null }, now = new Date()): Promise<"approved" | "invalid"> {
    const tokenHash = hashPortalToken(token);
    const claim = await prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.findUnique({ where: { tokenHash } });
      if (!proposal) return null;
      const claimed = await tx.proposal.updateMany({ where: { id: proposal.id, status: "SENT", tokenExpiresAt: { gt: now } }, data: { status: "APPROVED", approvedAt: now, approvedIp: who.ip, approvedUserAgent: who.userAgent?.slice(0, 200) ?? null } });
      if (claimed.count === 0) return null;
      const contact = await tx.contact.findFirst({ where: { id: proposal.contactId, workspaceId: proposal.workspaceId }, select: { id: true, leadStage: true } });
      if (contact && contact.leadStage !== "WON") await tx.contact.update({ where: { id: contact.id }, data: { leadStage: "WON", leadIntent: "ready_to_buy", qualifiedAt: now } });
      return { proposal, previousStage: (contact?.leadStage ?? null) as Stage | null };
    });
    if (!claim) return "invalid";

    // Depois do compromisso: auditoria (sync: é uma decisão de dinheiro), aviso ao dono, handoff. Nada daqui desfaz a aprovação.
    const { proposal, previousStage } = claim;
    const ctx: AuditContext = { workspaceId: proposal.workspaceId, actorId: `portal:${proposal.id}`, ip: who.ip };
    await AuditLedger.record(ctx, { entityType: "Proposal", entityId: proposal.id, action: "UPDATE" }, { previous: { status: "SENT" }, next: { status: "APPROVED", amountMinor: proposal.amountMinor, currency: proposal.currency, userAgent: who.userAgent?.slice(0, 200) ?? null } }, "sync").catch((err) => console.error("[portal] auditoria da aprovação falhou", err));
    await AuditLedger.record(ctx, { entityType: "Contact", entityId: proposal.contactId, action: "UPDATE" }, { previous: { leadStage: previousStage }, next: { leadStage: "WON", via: "portal_approval" } }, "sync").catch(() => {});
    await NotificationService.notify({ workspaceId: proposal.workspaceId, kind: "proposal_approved", severity: "info", title: "Proposta aprovada", body: `«${proposal.title}» (${formatMoney(proposal.amountMinor, proposal.currency)}) foi aprovada pelo cliente. O negócio passou a Ganho.`, contactId: proposal.contactId, dedupeKey: `proposal:${proposal.id}` }).catch(() => {});
    if (handoffSince()) await HandoffEngine.onWon(proposal.workspaceId, proposal.contactId, previousStage).catch((err) => console.error("[portal] handoff falhou", err));
    return "approved";
  },
};
