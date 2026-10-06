import { cronJob } from "@/lib/expansion/cron-route";
import { DataCleanerService } from "@/lib/cleaner/service";

export const maxDuration = 60;

// Data-Cleaner: procura de duplicados (semanal).
export const GET = cronJob("data-cleaner", () => DataCleanerService.scanAll());
