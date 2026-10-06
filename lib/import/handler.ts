import "server-only";
import { fail, guarded, MANAGERS, ok } from "@/lib/http/route";
import { mapColumns } from "@/lib/import/fuzzy";
import { mapCompetitorJson } from "@/lib/import/records";
import { commitRecords, defaultDialCode, importRequestSchema, MAX_BODY_BYTES, previewRows } from "@/lib/import/service";
import { requireFeature } from "@/lib/superadmin/flags";

// Os dois endpoints (/api/import/magic e /api/import/competitor) fazem o mesmo; só muda de onde vêm as linhas.
// Só OWNER e MANAGER importam em massa (uma importação grande é uma decisão de gestão, não de operação diária).
export function handleImport(request: Request, source: "magic" | "competitor") {
  return guarded(request, MANAGERS, `import/${source}`, async (who) => {
    const off = await requireFeature(who.workspaceId, "magic_importer");
    if (off) return off;
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return fail("payload_too_large", 413);
    const body = importRequestSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("invalid_input", 400);
    const { mode, mapping: override } = body.data;
    const dialCode = body.data.dialCode ?? defaultDialCode();

    let columns: string[];
    let rows: Record<string, unknown>[];
    let auto;
    if (source === "competitor") {
      const mapped = mapCompetitorJson(body.data.json);
      ({ columns, rows } = mapped);
      auto = mapped.mapping;
    } else {
      rows = body.data.rows ?? [];
      columns = body.data.columns?.length ? body.data.columns : [...new Set(rows.flatMap((r) => Object.keys(r)))];
      auto = mapColumns(columns, rows);
    }
    if (!rows.length) return fail("empty_file", 400);

    const { preview, records } = previewRows(columns, rows, override, dialCode, auto);
    if (mode === "preview") return ok({ preview });
    if (!preview.mapping.phone) return fail("phone_column_missing", 422); // sem telefone não há contacto no WhatsApp
    const result = await commitRecords(who.workspaceId, records, source === "competitor" ? "migração" : "ficheiro");
    return ok({ preview, result });
  });
}
