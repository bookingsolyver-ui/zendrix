import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

export function PaymentMethodCard({
  icon: Icon,
  label,
  selected,
  onSelect,
  children,
}: {
  icon: LucideIcon;
  label: string;
  selected: boolean;
  onSelect: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border transition-colors ${
        selected ? "border-emerald-500 bg-emerald-50/50" : "border-neutral-200 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? "border-emerald-500 bg-emerald-500" : "border-neutral-300"
          }`}
        >
          {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </span>
        <Icon className={`h-4 w-4 shrink-0 ${selected ? "text-emerald-600" : "text-neutral-400"}`} />
        <span className="text-sm font-medium text-neutral-900">{label}</span>
      </button>

      {selected && children && (
        <div className="border-t border-emerald-100 bg-white px-4 py-4">{children}</div>
      )}
    </div>
  );
}
