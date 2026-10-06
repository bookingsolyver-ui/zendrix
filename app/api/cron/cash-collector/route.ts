import { cronJob } from "@/lib/expansion/cron-route";
import { DunningService } from "@/lib/cash/service";

export const maxDuration = 60;

// Cash-Collector: lembretes de cobrança (diário).
export const GET = cronJob("cash-collector", () => DunningService.run());
