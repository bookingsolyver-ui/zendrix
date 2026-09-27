import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

export function SelectableCard({
  icon: Icon,
  label,
  selected,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
        selected
          ? "border-neon-green bg-neon-green/5"
          : "border-border bg-surface/40 hover:border-primary"
      }`}
    >
      {selected && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-background">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
        <Icon className={`h-5 w-5 ${selected ? "text-neon-green" : "text-muted"}`} />
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
}
