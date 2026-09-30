import { Plus } from "lucide-react";
import { KANBAN_COLUMNS, type DealCard } from "@/components/dashboard/crm/kanban-data";
import { SoonButton } from "@/components/ui/soon-button";

function DealCardView({ card }: { card: DealCard }) {
  return (
    <div className="glow-border cursor-grab space-y-3 rounded-xl p-4 transition-colors hover:border-primary active:cursor-grabbing">
      <p className="text-sm font-medium leading-snug text-foreground">{card.title}</p>
      <p className="neon-green-text text-base font-semibold">{card.value}</p>
      <div className="flex items-center justify-between">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-foreground">
          {card.assignee}
        </span>
        {card.tag && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              card.tag.tone === "danger"
                ? "bg-danger/15 text-danger"
                : "bg-surface-2 text-muted"
            }`}
          >
            {card.tag.label}
          </span>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard() {
  return (
    <div className="scrollbar-thin -mx-1 flex gap-4 overflow-x-auto px-1 pb-4">
      {KANBAN_COLUMNS.map((column) => (
        <div
          key={column.id}
          className="flex w-[280px] shrink-0 flex-col rounded-2xl border border-border bg-surface/40 p-3"
        >
          <div className="flex items-center justify-between px-1 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{column.title}</h3>
              <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-xs text-muted">
                {column.cards.length}
              </span>
            </div>
            <SoonButton feature={`Adicionar negócio em ${column.title}`}
              type="button"
              aria-label={`Adicionar negócio em ${column.title}`}
              className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
            </SoonButton>
          </div>

          <div className="space-y-3">
            {column.cards.map((card) => (
              <DealCardView key={card.id} card={card} />
            ))}
            {column.cards.length === 0 && (
              <p className="px-2 py-8 text-center text-xs text-muted">Sem negócios nesta fase.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
