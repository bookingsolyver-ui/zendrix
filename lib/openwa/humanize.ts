// Humanização e anti-ban: funções PURAS (sem rede nem base de dados), por isso testáveis.
// Nenhuma destas coisas garante que o WhatsApp não bloqueia um número: só reduzem o risco. O que mais pesa é
// o comportamento: responder a quem escreveu primeiro, não enviar em massa e não repetir texto idêntico.

export type Rng = () => number; // [0, 1)

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const between = (min: number, max: number, rng: Rng) => Math.round(min + rng() * (max - min));

// "A escrever…": ~35 ms por caractere, entre 1,2 e 5 s, com ±15% de variação.
export function typingMs(text: string, rng: Rng = Math.random): number {
  const base = clamp(text.length * 35, 1200, 5000);
  return clamp(Math.round(base * (0.85 + rng() * 0.3)), 1000, 5500);
}

// "A gravar áudio…": proporcional ao texto falado (~14 caracteres por segundo), entre 2 e 7 s.
export function recordingMs(spokenText: string, rng: Rng = Math.random): number {
  const base = clamp((spokenText.length / 14) * 1000, 2000, 7000);
  return clamp(Math.round(base * (0.85 + rng() * 0.3)), 1800, 7500);
}

// Pausa entre mensagens SEGUIDAS ao mesmo cliente (uma pessoa não dispara três mensagens no mesmo segundo).
export const betweenMessagesMs = (rng: Rng = Math.random) => between(900, 2600, rng);

// Limites por instância, mais apertados num número recém-ligado (aquecimento). Janela fixa, contada na base
// de dados (lib/rate-limit): partilhada por todas as instâncias da app.
export interface Window {
  name: string;
  limit: number;
  windowMs: number;
}
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function sendWindows(connectedAt: Date | null, now: Date = new Date()): Window[] {
  const ageDays = connectedAt ? Math.max(0, (now.getTime() - connectedAt.getTime()) / DAY) : 0;
  const tier = ageDays < 3 ? 0 : ageDays < 14 ? 1 : 2;
  const perMinute = [6, 10, 15][tier];
  const perHour = [40, 100, 200][tier];
  const perDay = [150, 400, 800][tier];
  return [
    { name: "m", limit: perMinute, windowMs: MIN },
    { name: "h", limit: perHour, windowMs: HOUR },
    { name: "d", limit: perDay, windowMs: DAY },
  ];
}
