import { handleImport } from "@/lib/import/handler";

export const maxDuration = 60;

// Migração com um clique de ferramentas concorrentes. Corpo: { mode: "preview" | "commit", json, mapping?, dialCode? },
// onde `json` é o ficheiro exportado tal como veio (array, ou objeto com contacts/data/results/...).
export async function POST(request: Request) {
  return handleImport(request, "competitor");
}
