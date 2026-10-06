import { cronJob } from "@/lib/expansion/cron-route";
import { NightwatchService } from "@/lib/nightwatch/service";

export const maxDuration = 60;

// Nightwatch AI: triagem de mensagens recebidas fora de horas (de 5 em 5 minutos).
export const GET = cronJob("nightwatch", () => NightwatchService.sweep());
