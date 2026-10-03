import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron/auth";
import { processOutbox, type ProcessSummary } from "@/lib/outbox/process";

export const maxDuration = 60;

// Worker da fila de saída, chamado pelo cron da Vercel (vercel.json). A Vercel envia
// `Authorization: Bearer <CRON_SECRET>` quando a variável CRON_SECRET existe no projeto: sem ela (ou com
// outro valor) ninguém consegue disparar o envio de mensagens por este URL.
const ROUND_LIMIT = 50;
const MAX_ROUNDS = 10; // até 500 mensagens por execução
const TIME_BUDGET_MS = 45_000; // a função tem 60 s: deixa folga para acabar o que está a meio

export async function GET(request: Request) {
  const ok = cronAuthorized(request);
  if (ok === null) {
    console.error("[cron/process-outbox] CRON_SECRET não está definido; a recusar");
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const deadlineAt = Date.now() + TIME_BUDGET_MS;
  const total: ProcessSummary = { claimed: 0, sent: 0, retried: 0, failed: 0, deferred: 0 };

  try {
    for (let round = 0; round < MAX_ROUNDS && Date.now() < deadlineAt; round++) {
      const summary = await processOutbox({ limit: ROUND_LIMIT, deadlineAt });
      for (const key of Object.keys(total) as (keyof ProcessSummary)[]) total[key] += summary[key];
      // Uma ronda que não reivindicou nada, ou que só adiou (ritmo) ou reagendou, não tem mais que fazer já.
      if (summary.claimed < ROUND_LIMIT || summary.sent + summary.failed === 0) break;
    }
  } catch (err) {
    console.error("[cron/process-outbox] falhou", err);
    return NextResponse.json({ error: "processing_failed", ...total }, { status: 500 });
  }

  if (total.claimed > 0) console.info("[cron/process-outbox]", JSON.stringify(total));
  return NextResponse.json({ success: true, ...total });
}
