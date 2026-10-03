import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseScheduleConfig, type ScheduleConfig } from "@/lib/schedule/config";
import { computeFreeSlots, dayRangeMs, findSlot, isValidDateISO, type Slot } from "@/lib/schedule/slots";

// A agenda nativa de uma organização: horários livres e marcações. A disponibilidade vem da configuração da
// própria organização; as marcações vivem na nossa base de dados. Quem marca (a IA) só pode escolher o que
// esta camada confirma estar livre, e a restrição única da base de dados impede a dupla marcação mesmo com
// dois pedidos ao mesmo tempo.

export async function loadScheduleConfig(workspaceId: string): Promise<ScheduleConfig | null> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { scheduleConfig: true } });
  const config = parseScheduleConfig(workspace?.scheduleConfig);
  return config?.enabled ? config : null;
}

// As marcações confirmadas que podem afetar esse dia (com a folga).
async function busyFor(workspaceId: string, config: ScheduleConfig, date: string) {
  const { fromMs, toMs } = dayRangeMs(date, config.timezone, config.bufferMinutes);
  const rows = await prisma.appointment.findMany({
    where: { workspaceId, status: "CONFIRMED", startsAt: { lt: new Date(toMs) }, endsAt: { gt: new Date(fromMs) } },
    select: { startsAt: true, endsAt: true },
  });
  return rows.map((row) => ({ startMs: row.startsAt.getTime(), endMs: row.endsAt.getTime() }));
}

export async function freeSlotsFor(workspaceId: string, config: ScheduleConfig, date: string, nowMs = Date.now()): Promise<Slot[]> {
  if (!isValidDateISO(date)) return [];
  return computeFreeSlots({ config, date, nowMs, busy: await busyFor(workspaceId, config, date) });
}

export type BookResult =
  | { ok: true; id: string; startMs: number; endMs: number }
  | { ok: false; error: "invalid_slot" | "slot_taken" };

export async function bookAppointment(input: {
  workspaceId: string;
  config: ScheduleConfig;
  date: string;
  time: string;
  customerName: string;
  customerEmail?: string | null;
  service?: string | null;
  conversationId?: string | null;
  contactId?: string | null;
  nowMs?: number;
}): Promise<BookResult> {
  const { workspaceId, config, date, time } = input;
  const nowMs = input.nowMs ?? Date.now();
  // Volta a calcular a disponibilidade AGORA: o horário oferecido há minutos pode já não estar livre.
  const slot = findSlot({ config, date, time, nowMs, busy: await busyFor(workspaceId, config, date) });
  if (!slot) return { ok: false, error: "invalid_slot" };

  const endMs = slot.startMs + config.slotMinutes * 60_000;
  try {
    const created = await prisma.appointment.create({
      data: {
        workspaceId,
        conversationId: input.conversationId ?? null,
        contactId: input.contactId ?? null,
        customerName: input.customerName,
        customerEmail: input.customerEmail ?? null,
        service: input.service ?? null,
        startsAt: new Date(slot.startMs),
        endsAt: new Date(endMs),
        // A chave única: dois pedidos para a mesma hora, só um entra.
        slotKey: new Date(slot.startMs).toISOString(),
      },
      select: { id: true },
    });
    return { ok: true, id: created.id, startMs: slot.startMs, endMs };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { ok: false, error: "slot_taken" };
    throw err;
  }
}

// Cancelar liberta a hora (slotKey volta a null). Só dentro da organização.
export async function cancelAppointment(workspaceId: string, id: string): Promise<boolean> {
  const { count } = await prisma.appointment.updateMany({ where: { id, workspaceId, status: "CONFIRMED" }, data: { status: "CANCELLED", slotKey: null } });
  return count > 0;
}

export const listUpcomingAppointments = (workspaceId: string, take = 50) =>
  prisma.appointment.findMany({
    where: { workspaceId, status: "CONFIRMED", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take,
    select: { id: true, customerName: true, customerEmail: true, service: true, startsAt: true, endsAt: true },
  });
