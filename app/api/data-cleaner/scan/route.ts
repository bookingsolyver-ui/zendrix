import { DataCleanerService } from "@/lib/cleaner/service";
import { guarded, MANAGERS, ok } from "@/lib/http/route";
import { requireFeature } from "@/lib/superadmin/flags";

export const maxDuration = 60;

// Procurar duplicados já, na organização de quem pede (o cron semanal faz o mesmo para todas).
export async function POST(request: Request) {
  return guarded(request, MANAGERS, "data-cleaner/scan", async (who) => (await requireFeature(who.workspaceId, "data_cleaner")) ?? ok({ ...(await DataCleanerService.scanWorkspace(who.workspaceId)) }));
}
