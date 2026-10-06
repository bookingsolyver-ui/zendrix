import "server-only";
import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron/auth";
import { SaaSErrorLogger } from "@/lib/superadmin/events";

// Casca comum dos crons do Expansion Pack: CRON_SECRET (503 se não existe, 401 se errado), execução e resumo em JSON.
// Todos os jobs são idempotentes: correr mais vezes do que o necessário não duplica nada.
export function cronJob(label: string, job: () => Promise<object>) {
  return async function GET(request: Request) {
    const ok = cronAuthorized(request);
    if (ok === null) {
      console.error(`[cron/${label}] CRON_SECRET não está definido; a recusar`);
      return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
    }
    if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    try {
      const summary = await job();
      console.info(`[cron/${label}]`, JSON.stringify(summary));
      return NextResponse.json({ success: true, ...summary });
    } catch (err) {
      console.error(`[cron/${label}] falhou`, err);
      await SaaSErrorLogger.capture({ route: `/api/cron/${label}`, method: "GET", status: 500, error: err });
      return NextResponse.json({ error: "processing_failed" }, { status: 500 });
    }
  };
}
