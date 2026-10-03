import "server-only";
import { prisma } from "@/lib/prisma";
import { nextStage, type LeadStageName, type LeadUpdate } from "@/lib/leads/lead";

export interface LeadUpdateResult {
  stage: LeadStageName;
  saved: string[];
  rejected: string[];
}

// Grava a qualificação de um contacto. Já vem sanitizada (lib/leads/lead.ts); aqui só se aplica, sempre dentro
// da organização, e o estado segue as regras fixas (nextStage).
export async function applyLeadUpdate(input: { workspaceId: string; contactId: string; update: LeadUpdate }): Promise<LeadUpdateResult | null> {
  const { workspaceId, contactId, update } = input;
  const contact = await prisma.contact.findFirst({ where: { id: contactId, workspaceId }, select: { leadStage: true, qualifiedAt: true } });
  if (!contact) return null;

  const current = contact.leadStage as LeadStageName;
  const stage = update.intent ? nextStage(current, update.intent) : current;
  const saved: string[] = [];
  if (update.name) saved.push("nome");
  if (update.email) saved.push("email");
  if (update.painPoint) saved.push("dor_principal");
  if (update.intent && update.intent !== "none") saved.push("intencao");

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      ...(update.name ? { name: update.name } : {}),
      ...(update.email ? { email: update.email } : {}),
      ...(update.painPoint ? { painPoint: update.painPoint } : {}),
      ...(update.intent && update.intent !== "none" ? { leadIntent: update.intent } : {}),
      ...(stage !== current ? { leadStage: stage } : {}),
      ...(stage === "QUALIFIED" && !contact.qualifiedAt ? { qualifiedAt: new Date() } : {}),
    },
  });
  return { stage, saved, rejected: update.rejected };
}
