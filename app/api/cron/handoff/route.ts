import { cronJob } from "@/lib/expansion/cron-route";
import { HandoffEngine } from "@/lib/handoff/engine";

export const maxDuration = 60;

// Handoff Engine: negócios ganhos -> bloqueio + tarefas Financeiro/Logística + auditoria (precisa de HANDOFF_SINCE).
export const GET = cronJob("handoff", () => HandoffEngine.sweep());
