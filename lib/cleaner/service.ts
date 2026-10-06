import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { phoneKey, scorePair, type ContactLike } from "@/lib/cleaner/similarity";
import { visibleName } from "@/lib/inbox/display";

// DATA-CLEANER: encontra clientes duplicados (semanalmente) e funde-os com segurança (por decisão humana).
// Nunca apaga: o registo redundante fica, marcado como fundido (MergedContact, com um retrato do que tinha), e tudo o
// que lhe pertencia passa para o principal numa só transação.

const MAX_CONTACTS_PER_WORKSPACE = 20_000;
const STAGE_RANK: Record<string, number> = { NEW: 0, ENGAGED: 1, QUALIFIED: 2, PAYMENT_SENT: 3, LOST: 1, WON: 4 };

export async function mergedContactIds(workspaceId: string): Promise<string[]> {
  return (await prisma.mergedContact.findMany({ where: { workspaceId }, select: { contactId: true } })).map((m) => m.contactId);
}

export const DataCleanerService = {
  // Procura pares duplicados numa organização. Agrupa por telefone (últimos 9 dígitos) e por e-mail: O(n), sem comparar
  // todos com todos.
  async scanWorkspace(workspaceId: string): Promise<{ contacts: number; found: number }> {
    const merged = new Set(await mergedContactIds(workspaceId));
    const contacts = (await prisma.contact.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" }, take: MAX_CONTACTS_PER_WORKSPACE, select: { id: true, name: true, waId: true, platform: true, email: true } })).filter((c) => !merged.has(c.id));

    const buckets = new Map<string, ContactLike[]>();
    const add = (key: string | null, c: ContactLike) => key && buckets.set(key, [...(buckets.get(key) ?? []), c]);
    for (const c of contacts) {
      if (c.platform === "WHATSAPP") add(phoneKey(c.waId) && `p:${phoneKey(c.waId)}`, c);
      add(c.email ? `e:${c.email.toLowerCase()}` : null, c);
    }

    const pairs = new Map<string, Prisma.DuplicateCandidateCreateManyInput>();
    for (const group of buckets.values()) {
      if (group.length < 2 || group.length > 20) continue; // grupos enormes (um número partilhado) são ruído
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const hit = scorePair(group[i], group[j]);
          if (hit) pairs.set(`${group[i].id}:${group[j].id}`, { workspaceId, primaryId: group[i].id, duplicateId: group[j].id, score: hit.score, reasons: hit.reasons }); // o 1.º é o mais antigo
        }
      }
    }
    const result = await prisma.duplicateCandidate.createMany({ data: [...pairs.values()], skipDuplicates: true });
    return { contacts: contacts.length, found: result.count };
  },

  async scanAll(): Promise<{ workspaces: number; found: number }> {
    const workspaces = await prisma.workspace.findMany({ where: { approvalStatus: "APPROVED", blockedAt: null }, select: { id: true } });
    let found = 0;
    for (const w of workspaces) found += (await this.scanWorkspace(w.id).catch((err) => (console.error("[data-cleaner] falhou", w.id, err), { found: 0 }))).found;
    return { workspaces: workspaces.length, found };
  },

  // Merge seguro. Devolve false se o par já não é válido (apagado, já fundido, de outra organização).
  async merge(workspaceId: string, candidateId: string, byUserId: string | null): Promise<"merged" | "not_found" | "invalid"> {
    const candidate = await prisma.duplicateCandidate.findFirst({ where: { id: candidateId, workspaceId, status: "PENDING" } });
    if (!candidate) return "not_found";
    const { primaryId, duplicateId } = candidate;

    return prisma.$transaction(async (tx) => {
      const [primary, dup] = await Promise.all([tx.contact.findFirst({ where: { id: primaryId, workspaceId } }), tx.contact.findFirst({ where: { id: duplicateId, workspaceId } })]);
      if (!primary || !dup || (await tx.mergedContact.count({ where: { workspaceId, contactId: { in: [primaryId, duplicateId] } } }))) return "invalid" as const;

      // 1) Campos: o principal manda; o que lhe falta vem do duplicado. Estado: o mais avançado. Opt-out: basta um (lei).
      const stage = (STAGE_RANK[dup.leadStage] ?? 0) > (STAGE_RANK[primary.leadStage] ?? 0) ? dup.leadStage : primary.leadStage;
      await tx.contact.update({
        where: { id: primaryId },
        data: {
          name: visibleName(primary.name) ? primary.name : dup.name,
          email: primary.email ?? dup.email,
          painPoint: primary.painPoint ?? dup.painPoint,
          leadIntent: primary.leadIntent ?? dup.leadIntent,
          leadStage: stage,
          qualifiedAt: primary.qualifiedAt ?? dup.qualifiedAt,
          optedOutAt: primary.optedOutAt ?? dup.optedOutAt,
        },
      });

      // 2) Tudo o que era do duplicado passa para o principal (notas, receita, cobranças, marcações, atribuição).
      await tx.contactNote.updateMany({ where: { workspaceId, contactId: duplicateId }, data: { contactId: primaryId } });
      await tx.paymentLink.updateMany({ where: { workspaceId, contactId: duplicateId }, data: { contactId: primaryId } });
      await tx.receivable.updateMany({ where: { workspaceId, contactId: duplicateId }, data: { contactId: primaryId } });
      await tx.appointment.updateMany({ where: { workspaceId, contactId: duplicateId }, data: { contactId: primaryId } });
      if (await tx.clientAssignment.count({ where: { workspaceId, contactId: primaryId } })) await tx.clientAssignment.deleteMany({ where: { workspaceId, contactId: duplicateId } });
      else await tx.clientAssignment.updateMany({ where: { workspaceId, contactId: duplicateId }, data: { contactId: primaryId } });

      // 3) Conversas: sem conversa no principal, a do duplicado passa para ele; com as duas, as mensagens juntam-se.
      const [pc, dc] = await Promise.all([tx.conversation.findFirst({ where: { workspaceId, contactId: primaryId } }), tx.conversation.findFirst({ where: { workspaceId, contactId: duplicateId } })]);
      if (dc && !pc) await tx.conversation.update({ where: { id: dc.id }, data: { contactId: primaryId } });
      else if (dc && pc) {
        await tx.message.updateMany({ where: { conversationId: dc.id }, data: { conversationId: pc.id } });
        const newer = dc.lastMessageAt > pc.lastMessageAt;
        await tx.conversation.update({ where: { id: pc.id }, data: { unreadCount: pc.unreadCount + dc.unreadCount, ...(newer ? { lastMessageAt: dc.lastMessageAt, lastMessagePreview: dc.lastMessagePreview } : {}) } });
        await tx.conversation.delete({ where: { id: dc.id } }); // já sem mensagens: só o recipiente vazio
      }

      // 4) Nota a explicar a fusão, retrato do duplicado, e o duplicado deixa de receber mensagens automáticas.
      await tx.contactNote.create({ data: { workspaceId, contactId: primaryId, source: "manual", body: `Fundido com o registo duplicado «${dup.name ?? "sem nome"}» (+${dup.waId}).` } });
      await tx.mergedContact.create({ data: { workspaceId, contactId: duplicateId, mergedIntoId: primaryId, mergedById: byUserId, snapshot: { name: dup.name, waId: dup.waId, platform: dup.platform, email: dup.email, leadStage: dup.leadStage, createdAt: dup.createdAt.toISOString() } } });
      await tx.contact.update({ where: { id: duplicateId }, data: { optedOutAt: dup.optedOutAt ?? new Date() } });
      await tx.duplicateCandidate.updateMany({ where: { workspaceId, status: "PENDING", OR: [{ primaryId: duplicateId }, { duplicateId }] }, data: { status: "DISMISSED" } });
      await tx.duplicateCandidate.update({ where: { id: candidateId }, data: { status: "MERGED" } });
      await tx.auditEvent.create({ data: { workspaceId, action: "merge.contacts", entityType: "contact", entityId: primaryId, actorUserId: byUserId, details: { mergedId: duplicateId, score: candidate.score } } });
      return "merged" as const;
    });
  },

  async dismiss(workspaceId: string, candidateId: string) {
    return (await prisma.duplicateCandidate.updateMany({ where: { id: candidateId, workspaceId, status: "PENDING" }, data: { status: "DISMISSED" } })).count;
  },
};
