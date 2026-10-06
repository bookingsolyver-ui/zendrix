import { NextResponse } from "next/server";
import { SmartAlertsEngine } from "@/lib/alerts/engine";
import { cronAuthorized } from "@/lib/cron/auth";

export const maxDuration = 60;

// Job diário dos Alertas Inteligentes (risco de churn e margens). Mesmo esquema dos outros workers: CRON_SECRET no
// cabeçalho Authorization. É idempotente (cada aviso tem chave única), por isso correr mais vezes do que o necessário
// não duplica nada. Como ligar: ver docs/zetrix-automation.md.
export async function GET(request: Request) {
  const ok = cronAuthorized(request);
  if (ok === null) {
    console.error("[cron/smart-alerts] CRON_SECRET não está definido; a recusar");
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const summary = await SmartAlertsEngine.run();
    console.info("[cron/smart-alerts]", JSON.stringify(summary));
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    console.error("[cron/smart-alerts] falhou", err);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
