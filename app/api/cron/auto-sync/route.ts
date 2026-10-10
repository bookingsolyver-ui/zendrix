import { NextResponse } from "next/server";
import { syncAudioNotes } from "@/lib/integrations/audio-notes";
import { cronAuthorized } from "@/lib/cron/auth";

export const maxDuration = 60;

// Kwanza Flow Auto-Sync: tarefas de entrada automática de dados (hoje: transcrições de notas de voz -> notas do cliente).
// Mesmo esquema dos outros workers (CRON_SECRET); idempotente. Como ligar: docs/kwanza-automation.md.
export async function GET(request: Request) {
  const ok = cronAuthorized(request);
  if (ok === null) {
    console.error("[cron/auto-sync] CRON_SECRET não está definido; a recusar");
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const audio = await syncAudioNotes();
    if (audio.created > 0) console.info("[cron/auto-sync]", JSON.stringify({ audio }));
    return NextResponse.json({ success: true, audio });
  } catch (err) {
    console.error("[cron/auto-sync] falhou", err);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
