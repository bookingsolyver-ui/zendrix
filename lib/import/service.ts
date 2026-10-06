import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/alerts/notification-service";
import { IMPORT_FIELDS, mapColumns, type ColumnMapping, type ImportField } from "@/lib/import/fuzzy";
import { buildRecords, MAX_IMPORT_ROWS, type ImportRecord, type RejectedRow } from "@/lib/import/records";

// MagicImportService: o miolo partilhado pelo Magic Importer (CSV/Excel) e pela migração de concorrentes (JSON).
// Recebe linhas cruas, mapeia as colunas com o fuzzy matching, valida, e (no commit) grava Contactos + Notas.
// Só ACRESCENTA: contactos que já existem (mesmo número) ficam como estão, nunca se sobrescrevem.

export const MAX_BODY_BYTES = 4 * 1024 * 1024; // a Vercel recusa corpos acima de 4,5 MB

export const defaultDialCode = () => (/^\d{1,4}$/.test(process.env.IMPORT_DEFAULT_DIAL_CODE ?? "") ? (process.env.IMPORT_DEFAULT_DIAL_CODE as string) : "351");

export const importRequestSchema = z.object({
  mode: z.enum(["preview", "commit"]),
  dialCode: z.string().regex(/^\d{1,4}$/).optional(),
  // CSV/Excel: colunas + linhas já lidas no browser. O mapeamento é opcional: sem ele, o servidor adivinha.
  columns: z.array(z.string().max(200)).max(100).optional(),
  rows: z.array(z.record(z.string().max(200), z.unknown())).max(MAX_IMPORT_ROWS).optional(),
  mapping: z.partialRecord(z.enum(IMPORT_FIELDS), z.string().max(200).nullable()).optional(),
  // Concorrentes: o JSON exportado tal como veio.
  json: z.unknown().optional(),
});

export interface ImportPreview {
  columns: string[];
  mapping: ColumnMapping;
  totalRows: number;
  valid: number;
  rejected: number;
  rejectedSample: RejectedRow[];
  sample: ImportRecord[];
}

// O mapeamento que o utilizador corrigiu à mão prevalece sobre o automático (null = «não importar esta coluna»).
function resolveMapping(columns: string[], auto: ColumnMapping, override: Partial<Record<ImportField, string | null>> | undefined): ColumnMapping {
  if (!override) return auto;
  const mapping: ColumnMapping = { ...auto };
  for (const field of IMPORT_FIELDS) {
    if (!(field in override)) continue;
    const column = override[field];
    if (column && columns.includes(column)) mapping[field] = { column, confidence: 1 };
    else delete mapping[field];
  }
  return mapping;
}

export function previewRows(columns: string[], rows: Record<string, unknown>[], mappingOverride: Partial<Record<ImportField, string | null>> | undefined, dialCode: string, auto?: ColumnMapping) {
  const mapping = resolveMapping(columns, auto ?? mapColumns(columns, rows), mappingOverride);
  const { records, rejected } = buildRecords(rows, mapping, dialCode);
  const preview: ImportPreview = { columns, mapping, totalRows: rows.length, valid: records.length, rejected: rejected.length, rejectedSample: rejected.slice(0, 10), sample: records.slice(0, 5) };
  return { preview, records };
}

const CHUNK = 500;

export async function commitRecords(workspaceId: string, records: ImportRecord[], sourceLabel: string): Promise<{ created: number; skippedExisting: number; notes: number }> {
  let created = 0;
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK);
    const result = await prisma.contact.createMany({
      data: chunk.map((r) => ({ workspaceId, platform: "WHATSAPP" as const, waId: r.waId, name: r.name, email: r.email, leadStage: r.stage })),
      skipDuplicates: true, // unique (organização, plataforma, número): quem já existe não se toca
    });
    created += result.count;
  }

  // Notas (observações e estado original), ligadas aos contactos pelo número.
  const withNotes = records.filter((r) => r.notes);
  let notes = 0;
  for (let i = 0; i < withNotes.length; i += CHUNK) {
    const chunk = withNotes.slice(i, i + CHUNK);
    const contacts = await prisma.contact.findMany({ where: { workspaceId, platform: "WHATSAPP", waId: { in: chunk.map((r) => r.waId) } }, select: { id: true, waId: true } });
    const idByWaId = new Map(contacts.map((c) => [c.waId, c.id]));
    const result = await prisma.contactNote.createMany({
      data: chunk.flatMap((r) => {
        const contactId = idByWaId.get(r.waId);
        return contactId ? [{ workspaceId, contactId, source: "import", sourceKey: `import:${workspaceId}:${r.waId}`, body: r.notes as string }] : [];
      }),
      skipDuplicates: true,
    });
    notes += result.count;
  }

  if (created > 0) {
    await NotificationService.notify({
      workspaceId,
      kind: "import_done",
      severity: "info",
      title: "Importação concluída",
      body: `${created} contacto${created === 1 ? "" : "s"} importado${created === 1 ? "" : "s"} (${sourceLabel}).`,
      dedupeKey: `import:${Date.now()}`,
    });
  }
  return { created, skippedExisting: records.length - created, notes };
}
