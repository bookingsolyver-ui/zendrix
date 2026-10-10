import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { markIntegrationExpired } from "@/lib/meta/integration-health";
import { createMetaTemplate, listMetaTemplates } from "@/lib/meta/templates-api";
import { asMetaStatus, buildCreatePayload, readMetaComponents } from "@/lib/templates/meta-payload";
import { MAX_TEMPLATES } from "@/lib/templates/schema";

export type TemplateError = "not_found" | "no_waba" | "token_unreadable" | "already_submitted" | "token_expired" | "meta_error" | "meta_transient";
export type TemplateResult<T = object> = ({ ok: true } & T) | { ok: false; error: TemplateError; detail?: string };

async function whatsappAccess(workspaceId: string) {
  const integration = await prisma.socialIntegration.findFirst({
    where: { workspaceId, platform: "WHATSAPP", status: "ACTIVE", wabaId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { id: true, accessToken: true, wabaId: true },
  });
  if (!integration?.wabaId) return null;
  try {
    return { integrationId: integration.id, wabaId: integration.wabaId, token: decryptSecret(integration.accessToken) };
  } catch {
    return "unreadable" as const;
  }
}

// Submete um rascunho (ou um modelo rejeitado) à Meta para aprovação. O estado fica PENDING até a Meta decidir
// (ver a sincronização, que traz o resultado). Um modelo já em análise ou aprovado não se volta a submeter.
export async function submitTemplate(workspaceId: string, id: string, examples: string[]): Promise<TemplateResult<{ status: string }>> {
  const template = await prisma.messageTemplate.findFirst({ where: { id, workspaceId } });
  if (!template) return { ok: false, error: "not_found" };
  if (!["DRAFT", "REJECTED"].includes(template.metaStatus)) return { ok: false, error: "already_submitted" };

  const access = await whatsappAccess(workspaceId);
  if (!access) return { ok: false, error: "no_waba" };
  if (access === "unreadable") return { ok: false, error: "token_unreadable" };

  const result = await createMetaTemplate(access.wabaId, access.token, buildCreatePayload(template, examples));
  if (!result.ok) {
    if (result.failure.reason === "token_expired") {
      await markIntegrationExpired(access.integrationId);
      return { ok: false, error: "token_expired" };
    }
    return { ok: false, error: result.failure.kind === "transient" ? "meta_transient" : "meta_error", detail: result.detail };
  }
  const status = asMetaStatus(result.data.status ?? "PENDING");
  await prisma.messageTemplate.update({
    where: { id },
    data: { metaStatus: status === "DRAFT" ? "PENDING" : status, metaTemplateId: result.data.id ?? null, rejectedReason: null, submittedAt: new Date(), syncedAt: new Date() },
  });
  return { ok: true, status: status === "DRAFT" ? "PENDING" : status };
}

// Traz da conta WhatsApp Business o estado de cada modelo e importa os que só existem na Meta.
// Chave: nome + idioma. Como o Kwanza Flow só aceita um modelo por nome, um nome repetido noutro idioma é ignorado.
export async function syncTemplates(workspaceId: string): Promise<TemplateResult<{ updated: number; imported: number; skipped: number }>> {
  const access = await whatsappAccess(workspaceId);
  if (!access) return { ok: false, error: "no_waba" };
  if (access === "unreadable") return { ok: false, error: "token_unreadable" };

  const listed = await listMetaTemplates(access.wabaId, access.token);
  if (!listed.ok) {
    if (listed.failure.reason === "token_expired") {
      await markIntegrationExpired(access.integrationId);
      return { ok: false, error: "token_expired" };
    }
    return { ok: false, error: listed.failure.kind === "transient" ? "meta_transient" : "meta_error", detail: listed.detail };
  }

  const local = await prisma.messageTemplate.findMany({ where: { workspaceId }, select: { id: true, name: true, language: true } });
  const byName = new Map(local.map((t) => [t.name, t]));
  let room = MAX_TEMPLATES - local.length;
  const counts = { updated: 0, imported: 0, skipped: 0 };
  const now = new Date();

  for (const row of listed.data) {
    const { body, sendable } = readMetaComponents(row.components);
    const meta = {
      metaStatus: asMetaStatus(row.status),
      metaTemplateId: row.id,
      rejectedReason: row.rejected_reason && row.rejected_reason !== "NONE" ? row.rejected_reason.slice(0, 200) : null,
      sendable,
      syncedAt: now,
    };
    const existing = byName.get(row.name);
    if (existing) {
      if (existing.language !== row.language) { counts.skipped++; continue; }
      await prisma.messageTemplate.update({ where: { id: existing.id }, data: meta });
      counts.updated++;
    } else if (body && room > 0) {
      await prisma.messageTemplate.create({
        data: { workspaceId, name: row.name, category: row.category === "MARKETING" ? "MARKETING" : "UTILITY", language: row.language, body: body.slice(0, 1024), submittedAt: now, ...meta },
      });
      room--;
      counts.imported++;
    } else counts.skipped++;
  }
  return { ok: true, ...counts };
}
