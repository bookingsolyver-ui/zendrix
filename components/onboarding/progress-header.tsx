import { X } from "lucide-react";

export function ProgressHeader({
  step,
  total,
  onSkip,
}: {
  step: number;
  total: number;
  onSkip: () => void;
}) {
  return (
    <header className="px-6 pt-6 sm:px-10">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onSkip}
          aria-label="Fechar onboarding"
          className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium text-muted">
          Etapa {step} de {total}
        </span>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-2 transition-all duration-300 ease-out"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </header>
  );
}
