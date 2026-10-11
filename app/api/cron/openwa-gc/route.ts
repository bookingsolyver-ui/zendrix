import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron/auth";
import { sweepOrphanQrSessions } from "@/lib/openwa/session-manager";

export const maxDuration = 60;

// Limpeza das sessões OpenWA abandonadas (QR aberto e página fechada) e das órfãs no servidor. Idempotente:
// nunca toca numa sessão ligada. O workflow outbox.yml chama-a de 5 em 5 minutos.
export async function GET(request: Request) {
  const ok = cronAuthorized(request);
  if (ok === null) {
    console.error("[cron/openwa-gc] CRON_SECRET não está definido; a recusar");
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const summary = await sweepOrphanQrSessions({
      budgetMs: 45_000,
      maxDeletes: 50,
    });
    if (
      summary.pendingRemoved +
        summary.orphansRemoved +
        summary.pendingFailed +
        summary.orphansFailed >
      0
    ) {
      console.info("[cron/openwa-gc]", JSON.stringify(summary));
    }
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    console.error(
      "[cron/openwa-gc] falhou",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json({ error: "gc_failed" }, { status: 500 });
  }
}
