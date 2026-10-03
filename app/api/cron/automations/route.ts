import { NextResponse } from "next/server";
import { runAutomations } from "@/lib/automations/engine";
import { cronAuthorized } from "@/lib/cron/auth";
import { drainOutbox } from "@/lib/outbox/process";

export const maxDuration = 60;

const TIME_BUDGET_MS = 45_000;

// Worker das automações: varre os eventos novos e executa as ações devidas. Mesmo esquema dos outros workers
// (CRON_SECRET no cabeçalho Authorization), chamado de 5 em 5 minutos.
export async function GET(request: Request) {
  const ok = cronAuthorized(request);
  if (ok === null) {
    console.error("[cron/automations] CRON_SECRET não está definido; a recusar");
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const deadlineAt = Date.now() + TIME_BUDGET_MS;
    const summary = await runAutomations({ deadlineAt });
    if (summary.stepsRun > 0) await drainOutbox(Math.max(1_000, deadlineAt - Date.now()));
    if (summary.runsCreated + summary.stepsRun + summary.stale > 0) console.info("[cron/automations]", JSON.stringify(summary));
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    console.error("[cron/automations] falhou", err);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
