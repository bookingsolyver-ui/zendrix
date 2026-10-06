import { handleImport } from "@/lib/import/handler";

export const maxDuration = 60;

// Magic Importer (CSV/Excel já lido no browser). Corpo: { mode: "preview" | "commit", columns, rows, mapping?, dialCode? }.
export async function POST(request: Request) {
  return handleImport(request, "magic");
}
