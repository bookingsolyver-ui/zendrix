import { Play } from "lucide-react";
import { SoonButton } from "@/components/ui/soon-button";

export function VideoBlock() {
  return (
    <div className="glow-border flex flex-col items-start justify-between gap-4 rounded-2xl p-5 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <Play className="h-5 w-5 text-primary" fill="currentColor" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Passo a passo em vídeo</h3>
          <p className="mt-1 text-sm text-muted">5 vídeos · 82 min no total</p>
        </div>
      </div>

      <SoonButton feature="Assistir"
        type="button"
        className="glow-border shrink-0 rounded-full px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary"
      >
        Assistir
      </SoonButton>
    </div>
  );
}
