import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron/auth";
import { runFollowUps } from "@/lib/followups/engine";

export const maxDuration = 60;

const TIME_BUDGET_MS = 45_000; // a função tem 60 s: deixa folga para acabar o que está a meio

// Worker dos seguimentos automáticos (reengajamento). Mesmo esquema do worker da fila: CRON_SECRET no cabeçalho
// Authorization. Chamado de 5 em 5 minutos pelo workflow do GitHub (e uma vez por dia pelo cron da Vercel).
export async function GET(request: Request) {
  const ok = cronAuthorized(request);
  if (ok === null) {
    console.error("[cron/follow-ups] CRON_SECRET não está definido; a recusar");
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const summary = await runFollowUps({ deadlineAt: Date.now() + TIME_BUDGET_MS });
    if (summary.sent > 0) console.info("[cron/follow-ups]", JSON.stringify(summary));
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    console.error("[cron/follow-ups] falhou", err);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
