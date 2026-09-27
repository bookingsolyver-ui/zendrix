"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function buildMonthGrid(year: number, month: number): (number | null)[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function MiniCalendar() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const cells = buildMonthGrid(cursor.getFullYear(), cursor.getMonth());
  const isCurrentMonth =
    cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();

  return (
    <div className="glow-border rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          {MONTH_LABELS[cursor.getMonth()]} {cursor.getFullYear()}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Mês seguinte"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-y-1.5 text-center">
        {WEEKDAY_LABELS.map((label, index) => (
          <span key={`${label}-${index}`} className="text-xs font-medium text-muted">
            {label}
          </span>
        ))}

        {cells.map((day, index) => {
          const isToday = isCurrentMonth && day === today.getDate();

          return (
            <span
              key={index}
              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                day === null
                  ? ""
                  : isToday
                    ? "bg-green-500 font-semibold text-background"
                    : "text-foreground hover:bg-surface-2"
              }`}
            >
              {day ?? ""}
            </span>
          );
        })}
      </div>

      <button
        type="button"
        className="glow-border mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary"
      >
        <Plus className="h-4 w-4" />
        Novo tipo de compromisso
      </button>
    </div>
  );
}
