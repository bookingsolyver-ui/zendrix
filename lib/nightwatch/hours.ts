// Horário noturno e escolha do vendedor. Puro (sem servidor): testável.

// Hora local (0-23) de um instante num fuso IANA.
export function localHour(at: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone }).format(at);
  return Number(hour);
}

// Fora do expediente: das 20h às 08h (janela que passa a meia-noite).
export function isAfterHours(at: Date, timeZone: string, startHour = 20, endHour = 8): boolean {
  const h = localHour(at, timeZone);
  return startHour > endHour ? h >= startHour || h < endHour : h >= startHour && h < endHour;
}

// O vendedor com menos carga; empate pelo id (determinístico).
export function pickLeastLoaded<T extends { id: string; load: number }>(candidates: T[]): T | null {
  return [...candidates].sort((a, b) => a.load - b.load || a.id.localeCompare(b.id))[0] ?? null;
}

export const QUESTIONS_DEFAULT = ["Quantas unidades precisa?", "Para quando precisa (prazo)?"] as const;
