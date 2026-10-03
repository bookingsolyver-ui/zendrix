"use client";

import { useState, type DragEvent, type FormEvent } from "react";
import { CalendarDays, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { BTN_GHOST, BTN_PRIMARY, INPUT } from "@/components/dashboard/settings/ui";
import { callApi, errorMessage } from "@/lib/client/api";
import { TASK_PRIORITIES, TASK_PRIORITY_LABEL, TASK_STATUSES, TASK_STATUS_LABEL, insertAt, type TaskPriorityValue, type TaskStatusValue } from "@/lib/crm/schemas";

export interface TaskView {
  id: string;
  title: string;
  description: string;
  status: TaskStatusValue;
  priority: TaskPriorityValue;
  dueAt: string | null; // "2026-10-09"
}

const PRIORITY_STYLE: Record<TaskPriorityValue, string> = {
  LOW: "bg-surface-2 text-muted",
  MEDIUM: "bg-sky-500/15 text-sky-300",
  HIGH: "bg-danger/15 text-danger",
};

const dueFormat = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", timeZone: "UTC" });
const todayIso = () => new Date().toISOString().slice(0, 10);

type Columns = Record<TaskStatusValue, TaskView[]>;

function group(tasks: TaskView[]): Columns {
  const columns: Columns = { TODO: [], DOING: [], DONE: [] };
  for (const task of tasks) columns[task.status].push(task);
  return columns;
}

// Quadro kanban real: arrastar entre colunas (ou usar o seletor "Mover para") grava na base de dados.
export function KanbanBoard({ initialTasks }: { initialTasks: TaskView[] }) {
  const [columns, setColumns] = useState<Columns>(() => group(initialTasks));
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatusValue | null>(null);
  const [editing, setEditing] = useState<TaskView | "new" | null>(null);
  const [newStatus, setNewStatus] = useState<TaskStatusValue>("TODO");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const find = (id: string) => TASK_STATUSES.flatMap((status) => columns[status]).find((task) => task.id === id);

  async function move(id: string, status: TaskStatusValue, index?: number) {
    const task = find(id);
    if (!task) return;
    const previous = columns;
    const target = (previous[status] ?? []).filter((t) => t.id !== id);
    const at = index === undefined ? target.length : Math.min(index, target.length);
    const next: Columns = { TODO: previous.TODO.filter((t) => t.id !== id), DOING: previous.DOING.filter((t) => t.id !== id), DONE: previous.DONE.filter((t) => t.id !== id) };
    next[status] = insertAt([...target.map((t) => t.id), id], id, at).map((taskId) => (taskId === id ? { ...task, status } : target.find((t) => t.id === taskId)!));
    setColumns(next);
    setError(null);
    const result = await callApi(`/api/crm/tasks/${id}`, "PATCH", { status, index: at });
    if (!result.ok) {
      setColumns(previous);
      setError(errorMessage(result.error));
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = {
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      priority: String(data.get("priority")),
      dueAt: String(data.get("dueAt") ?? ""),
    };
    setBusy(true);
    setError(null);
    if (editing === "new") {
      const result = await callApi("/api/crm/tasks", "POST", { ...body, status: newStatus });
      if (result.ok && result.id) {
        const created: TaskView = { id: result.id, title: body.title.trim(), description: body.description.trim(), status: newStatus, priority: body.priority as TaskPriorityValue, dueAt: body.dueAt || null };
        setColumns((prev) => ({ ...prev, [newStatus]: [...prev[newStatus], created] }));
        setEditing(null);
      } else setError(errorMessage(result.error));
    } else if (editing) {
      const result = await callApi(`/api/crm/tasks/${editing.id}`, "PATCH", body);
      if (result.ok) {
        const id = editing.id;
        setColumns((prev) => {
          const map = (list: TaskView[]) => list.map((t) => (t.id === id ? { ...t, title: body.title.trim(), description: body.description.trim(), priority: body.priority as TaskPriorityValue, dueAt: body.dueAt || null } : t));
          return { TODO: map(prev.TODO), DOING: map(prev.DOING), DONE: map(prev.DONE) };
        });
        setEditing(null);
      } else setError(errorMessage(result.error));
    }
    setBusy(false);
  }

  async function remove(task: TaskView) {
    if (!window.confirm(`Apagar a tarefa «${task.title}»?`)) return;
    const previous = columns;
    setColumns({ TODO: previous.TODO.filter((t) => t.id !== task.id), DOING: previous.DOING.filter((t) => t.id !== task.id), DONE: previous.DONE.filter((t) => t.id !== task.id) });
    setEditing(null);
    const result = await callApi(`/api/crm/tasks/${task.id}`, "DELETE");
    if (!result.ok) {
      setColumns(previous);
      setError(errorMessage(result.error));
    }
  }

  const onDrop = (event: DragEvent, status: TaskStatusValue, index?: number) => {
    event.preventDefault();
    event.stopPropagation();
    const id = dragId ?? event.dataTransfer.getData("text/plain");
    setDragId(null);
    setOverColumn(null);
    if (id) void move(id, status, index);
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={() => { setNewStatus("TODO"); setEditing("new"); setError(null); }} className={BTN_PRIMARY}>
          <Plus className="h-4 w-4" />
          Nova tarefa
        </button>
      </div>
      {error && !editing && (
        <p role="alert" className="mb-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="scrollbar-thin -mx-1 flex gap-4 overflow-x-auto px-1 pb-4">
        {TASK_STATUSES.map((status) => (
          <div
            key={status}
            onDragOver={(event) => { event.preventDefault(); setOverColumn(status); }}
            onDragLeave={() => setOverColumn((current) => (current === status ? null : current))}
            onDrop={(event) => onDrop(event, status)}
            className={`flex w-[300px] shrink-0 flex-col rounded-2xl border bg-surface/40 p-3 transition-colors ${overColumn === status ? "border-primary" : "border-border"}`}
          >
            <div className="flex items-center justify-between px-1 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{TASK_STATUS_LABEL[status]}</h3>
                <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-xs text-muted">{columns[status].length}</span>
              </div>
              <button type="button" aria-label={`Adicionar tarefa em ${TASK_STATUS_LABEL[status]}`} onClick={() => { setNewStatus(status); setEditing("new"); setError(null); }} className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground">
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-[3rem] space-y-3">
              {columns[status].map((task, index) => {
                const overdue = task.dueAt !== null && status !== "DONE" && task.dueAt < todayIso();
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(event) => { setDragId(task.id); event.dataTransfer.setData("text/plain", task.id); event.dataTransfer.effectAllowed = "move"; }}
                    onDragEnd={() => { setDragId(null); setOverColumn(null); }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => onDrop(event, status, index)}
                    className={`glow-border cursor-grab space-y-3 rounded-xl p-4 transition-colors hover:border-primary active:cursor-grabbing ${dragId === task.id ? "opacity-40" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-snug ${status === "DONE" ? "text-muted line-through" : "text-foreground"}`}>{task.title}</p>
                      <button type="button" aria-label="Editar tarefa" onClick={() => { setEditing(task); setError(null); }} className="shrink-0 rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {task.description && <p className="line-clamp-2 text-xs text-muted">{task.description}</p>}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[task.priority]}`}>{TASK_PRIORITY_LABEL[task.priority]}</span>
                      {task.dueAt && (
                        <span className={`flex items-center gap-1 text-xs ${overdue ? "text-danger" : "text-muted"}`}>
                          <CalendarDays className="h-3 w-3" />
                          {dueFormat.format(new Date(`${task.dueAt}T12:00:00Z`))}
                        </span>
                      )}
                    </div>
                    <select
                      aria-label="Mover para"
                      value={status}
                      onChange={(event) => void move(task.id, event.target.value as TaskStatusValue)}
                      className="w-full rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs text-muted outline-none"
                    >
                      {TASK_STATUSES.map((option) => (
                        <option key={option} value={option}>
                          Mover para: {TASK_STATUS_LABEL[option]}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
              {columns[status].length === 0 && <p className="px-2 py-8 text-center text-xs text-muted">Sem tarefas nesta etapa. Arraste uma para aqui.</p>}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing === "new" ? "Nova tarefa" : "Editar tarefa"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3">
            <input name="title" required maxLength={140} defaultValue={editing === "new" ? "" : editing.title} placeholder="Título da tarefa" aria-label="Título" className={`${INPUT} w-full`} />
            <textarea name="description" rows={3} maxLength={2000} defaultValue={editing === "new" ? "" : editing.description} placeholder="Descrição (opcional)" aria-label="Descrição" className={`${INPUT} w-full`} />
            <div className="grid grid-cols-2 gap-3">
              <select name="priority" defaultValue={editing === "new" ? "MEDIUM" : editing.priority} aria-label="Prioridade" className={`${INPUT} bg-[#111]`}>
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    Prioridade {TASK_PRIORITY_LABEL[priority].toLowerCase()}
                  </option>
                ))}
              </select>
              <input name="dueAt" type="date" defaultValue={editing === "new" ? "" : editing.dueAt ?? ""} aria-label="Data de entrega" className={INPUT} />
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className={BTN_PRIMARY}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar
                </button>
                <button type="button" onClick={() => setEditing(null)} className={BTN_GHOST}>
                  Cancelar
                </button>
              </div>
              {editing !== "new" && (
                <button type="button" onClick={() => void remove(editing)} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                  Apagar
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
