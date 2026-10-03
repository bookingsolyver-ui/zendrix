// Validação das tarefas do quadro e dos documentos. Puro (sem servidor).
import { z } from "zod";

export const TASK_STATUSES = ["TODO", "DOING", "DONE"] as const;
export type TaskStatusValue = (typeof TASK_STATUSES)[number];
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type TaskPriorityValue = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUS_LABEL: Record<TaskStatusValue, string> = { TODO: "A fazer", DOING: "Em curso", DONE: "Concluído" };
export const TASK_PRIORITY_LABEL: Record<TaskPriorityValue, string> = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" };

// Data de entrega: "2026-10-09" (campo de data do browser) ou vazio.
const dueSchema = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()])
  .transform((value) => (value ? new Date(`${value}T12:00:00.000Z`) : null))
  .refine((date) => date === null || !Number.isNaN(date.getTime()), "invalid_date");

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(TASK_STATUSES).default("TODO"),
  priority: z.enum(TASK_PRIORITIES).default("MEDIUM"),
  dueAt: dueSchema.optional(),
});

export const taskPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(140),
    description: z.string().trim().max(2000),
    status: z.enum(TASK_STATUSES),
    priority: z.enum(TASK_PRIORITIES),
    dueAt: dueSchema,
    // Posição pedida na coluna de destino (0 = topo). Fora do intervalo cola ao fim.
    index: z.number().int().min(0).max(10_000),
  })
  .partial();

export const MAX_TASKS = 500;

export const docInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().max(20_000).default(""),
});
export const MAX_DOCS = 200;

// Onde fica uma tarefa movida: dado os ids ordenados da coluna de destino (sem a tarefa), devolve a nova ordem.
export function insertAt(ids: string[], id: string, index: number): string[] {
  const without = ids.filter((existing) => existing !== id);
  const at = Math.min(Math.max(index, 0), without.length);
  return [...without.slice(0, at), id, ...without.slice(at)];
}
