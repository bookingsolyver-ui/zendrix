import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron/auth";
import { scanEndingSoon } from "@/lib/email/lifecycle";
import { processPendingEmails } from "@/lib/email/notify";

export const maxDuration = 60;

const TIME_BUDGET_MS = 45_000;

// Worker dos e-mails: procura os testes e subscrições que terminam nos próximos 5 dias (um aviso por fim de período)
// e envia os e-mails que ficaram pendentes (envio falhado, avisos do administrador). Mesmo esquema dos outros workers:
// CRON_SECRET no cabeçalho Authorization, chamado de 5 em 5 minutos.
export async function GET(request: Request) {
  const ok = cronAuthorized(request);
  if (ok === null) {
    console.error("[cron/emails] CRON_SECRET não está definido; a recusar");
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const deadlineAt = Date.now() + TIME_BUDGET_MS;
    const lifecycle = await scanEndingSoon();
    const pending = await processPendingEmails(60, deadlineAt);
    if (lifecycle.queued + pending.tried > 0) console.info("[cron/emails]", JSON.stringify({ lifecycle, pending }));
    return NextResponse.json({ success: true, lifecycle, pending });
  } catch (err) {
    console.error("[cron/emails] falhou", err);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
