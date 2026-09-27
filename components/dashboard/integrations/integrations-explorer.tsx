"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { FILTERS, INTEGRATION_APPS, type AppCategory } from "@/components/dashboard/integrations/apps-data";
import { AppCard } from "@/components/dashboard/integrations/app-card";

export function IntegrationsExplorer() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | AppCategory>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredApps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return INTEGRATION_APPS.filter((app) => {
      const matchesFilter = activeFilter === "all" || app.category === activeFilter;
      const matchesQuery =
        !normalizedQuery ||
        app.name.toLowerCase().includes(normalizedQuery) ||
        app.description.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [query, activeFilter]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar integrações..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-16 text-sm text-white placeholder:text-white/40 outline-none backdrop-blur-md transition-colors focus:border-emerald-500/50"
        />
        <kbd className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-white/15 bg-white/5 px-1.5 py-1 text-[10px] font-medium text-white/40">
          ⌘K
        </kbd>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === filter.id
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredApps.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}

        {filteredApps.length === 0 && (
          <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 py-12 text-center">
            <p className="text-sm text-white/50">Nenhuma integração encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
