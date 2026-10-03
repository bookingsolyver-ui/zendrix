import { NextResponse } from "next/server";
import { runCampaigns } from "@/lib/campaigns/engine";
import { cronAuthorized } from "@/lib/cron/auth";
import { drainOutbox } from "@/lib/outbox/process";

export const maxDuration = 60;

const TIME_BUDGET_MS = 45_000;

// Worker das campanhas: arranca as agendadas cuja hora chegou e enfileira os lotes das que estão a enviar. Mesmo
// esquema dos outros workers (CRON_SECRET no cabeçalho Authorization), chamado de 5 em 5 minutos.
export async function GET(request: Request) {
  const ok = cronAuthorized(request);
  if (ok === null) {
    console.error("[cron/campaigns] CRON_SECRET não está definido; a recusar");
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const deadlineAt = Date.now() + TIME_BUDGET_MS;
    const summary = await runCampaigns({ deadlineAt });
    if (summary.processed > 0) await drainOutbox(Math.max(1_000, deadlineAt - Date.now()));
    if (summary.started + summary.processed + summary.stale > 0) console.info("[cron/campaigns]", JSON.stringify(summary));
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    console.error("[cron/campaigns] falhou", err);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
