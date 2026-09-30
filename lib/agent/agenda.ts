// Agendamentos pelo Cal.com (API v2).
//
// DESLIGADO nesta primeira versão. Não existe agenda de demonstração de propósito: sem uma agenda
// real, o agente diria ao cliente que uma marcação ficou confirmada quando não existe.
// Para ligar: AGENDAMENTO_ATIVO = true e definir CAL_API_KEY + CAL_EVENT_TYPE_ID no .env.local.

export const AGENDAMENTO_ATIVO = false;

const CAL = "https://api.cal.com/v2";

const cabecalho = (versao: string) => ({
  Authorization: `Bearer ${process.env.CAL_API_KEY}`,
  "cal-api-version": versao,
  "Content-Type": "application/json",
});

const horaLocal = (iso: string, fuso: string) =>
  new Intl.DateTimeFormat("pt-PT", { timeZone: fuso, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    new Date(iso)
  );

// Deslocamento do fuso nesse dia, ex.: "+01:00".
function offset(data: string, fuso: string) {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: fuso, timeZoneName: "longOffset" }).formatToParts(
    new Date(`${data}T12:00:00Z`)
  );
  const valor = (partes.find((p) => p.type === "timeZoneName")?.value ?? "").replace("GMT", "");
  return valor === "" ? "+00:00" : valor;
}

export const agenda = {
  async horariosLivres(data: string, fuso: string): Promise<string[]> {
    const o = offset(data, fuso);
    const q = new URLSearchParams({
      eventTypeId: process.env.CAL_EVENT_TYPE_ID ?? "",
      start: new Date(`${data}T00:00:00${o}`).toISOString(),
      end: new Date(`${data}T23:59:59${o}`).toISOString(),
      timeZone: fuso,
    });
    const r = await fetch(`${CAL}/slots?${q}`, { headers: cabecalho("2024-09-04"), signal: AbortSignal.timeout(15_000) });
    const j = await r.json();
    if (!r.ok) throw new Error(`Cal.com slots ${r.status}`);
    return (Object.values(j.data ?? {}) as { start: string }[][]).flat().map((s) => horaLocal(s.start, fuso));
  },

  async marcar(p: { data: string; hora: string; nome: string; servico: string; telefone: string; fuso: string }) {
    const corpo = {
      start: new Date(`${p.data}T${p.hora}:00${offset(p.data, p.fuso)}`).toISOString(),
      eventTypeId: Number(process.env.CAL_EVENT_TYPE_ID),
      attendee: {
        name: p.nome,
        ...(process.env.CAL_EMAIL_PADRAO ? { email: process.env.CAL_EMAIL_PADRAO } : {}),
        timeZone: p.fuso,
        phoneNumber: `+${p.telefone.replace(/\D/g, "")}`,
        language: "pt",
      },
      bookingFieldsResponses: { notes: `${p.servico} · agendado pelo WhatsApp` },
    };
    const r = await fetch(`${CAL}/bookings`, {
      method: "POST",
      headers: cabecalho("2026-02-25"),
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(15_000),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`Cal.com booking ${r.status}`);
    return { id: (j.data?.uid ?? j.data?.id) as string };
  },
};
