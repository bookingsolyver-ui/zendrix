// Regras das cobranças automáticas. Puro (sem servidor): testável.
export const DAY_MS = 86_400_000;
export const MAX_REMINDERS = 6;
export const REMINDER_INTERVAL_DAYS = 3;
export const ESCALATE_AFTER = 3; // a partir do 4.º lembrete o tom endurece

export interface DunningInput {
  status: string;
  dueAt: Date;
  remindersSent: number;
  lastReminderAt: Date | null;
}

// Vencida há pelo menos um dia (o primeiro lembrete sai no dia a seguir) e sem lembrete recente.
export function isReminderDue(r: DunningInput, now: Date): boolean {
  if (r.status !== "PENDING" || r.remindersSent >= MAX_REMINDERS) return false;
  if (now.getTime() - r.dueAt.getTime() < DAY_MS) return false;
  return !r.lastReminderAt || now.getTime() - r.lastReminderAt.getTime() >= REMINDER_INTERVAL_DAYS * DAY_MS;
}

export type Tone = "friendly" | "firm" | "final";
export const toneFor = (remindersSent: number): Tone => (remindersSent < ESCALATE_AFTER ? "friendly" : remindersSent < MAX_REMINDERS - 1 ? "firm" : "final");

export function formatMoney(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency, maximumFractionDigits: 2 }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}

export function buildReminder(input: { name: string | null; reference: string; amountMinor: number; currency: string; dueAt: Date; paymentReference: string | null; remindersSent: number; now: Date }): string {
  const days = Math.max(1, Math.floor((input.now.getTime() - input.dueAt.getTime()) / DAY_MS));
  const since = days === 1 ? "venceu ontem" : `venceu há ${days} dias`;
  const money = formatMoney(input.amountMinor, input.currency);
  const hello = input.name ? `Olá ${input.name.split(" ")[0]}` : "Olá";
  const pay = input.paymentReference ? ` Segue a referência para regularização: ${input.paymentReference}.` : " Responda a esta mensagem e enviamos os dados para regularização.";
  switch (toneFor(input.remindersSent)) {
    case "friendly":
      return `${hello}! Notámos que a fatura ${input.reference} de ${money} ${since}.${pay} Se já pagou, ignore esta mensagem e obrigado!`;
    case "firm":
      return `${hello}. A fatura ${input.reference} de ${money} continua por regularizar (${since}). Pedimos que efetue o pagamento o mais breve possível.${pay}`;
    default:
      return `${hello}. Último aviso: a fatura ${input.reference} de ${money} ${since} e continua em aberto. Sem regularização, teremos de encaminhar o processo para a nossa equipa responsável.${pay}`;
  }
}
