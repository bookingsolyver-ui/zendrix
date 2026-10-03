import { ChevronDown } from "lucide-react";
import { SoonButton } from "@/components/ui/soon-button";

// Filtros da listagem. Ainda não há dados para filtrar, por isso só avisam que chegam em breve.
export function FilterBar({ filters }: { filters: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <SoonButton
          key={filter}
          feature="Filtros"
          className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3.5 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          {filter}
          <ChevronDown className="h-3.5 w-3.5" />
        </SoonButton>
      ))}
    </div>
  );
}
