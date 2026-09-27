"use client";

import { useState, type DragEvent, type FormEvent } from "react";
import { CheckCircle2, FileText, Link as LinkIcon, Plus, UploadCloud, X } from "lucide-react";

type SourceKind = "pdf" | "link";

type Source = {
  id: string;
  kind: SourceKind;
  name: string;
  meta: string;
};

const INITIAL_SOURCES: Source[] = [
  { id: "src-1", kind: "pdf", name: "Catalogo_Produtos_2026.pdf", meta: "2.4 MB" },
  { id: "src-2", kind: "pdf", name: "Politica_de_Reembolsos.pdf", meta: "180 KB" },
  { id: "src-3", kind: "link", name: "zentrix.com/perguntas-frequentes", meta: "Site" },
];

export function KnowledgeSources() {
  const [sources, setSources] = useState<Source[]>(INITIAL_SOURCES);
  const [isDragging, setIsDragging] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;

    setSources((prev) => [
      ...files.map((file) => ({
        id: `${file.name}-${Date.now()}`,
        kind: "pdf" as const,
        name: file.name,
        meta: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      })),
      ...prev,
    ]);
  }

  function handleAddLink(event: FormEvent) {
    event.preventDefault();
    const trimmed = linkValue.trim();
    if (!trimmed) return;

    setSources((prev) => [
      { id: `link-${Date.now()}`, kind: "link", name: trimmed, meta: "Site" },
      ...prev,
    ]);
    setLinkValue("");
  }

  function removeSource(id: string) {
    setSources((prev) => prev.filter((source) => source.id !== id));
  }

  return (
    <div className="glow-border rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2">
          <UploadCloud className="h-4 w-4 text-neon-green" />
        </span>
        <h2 className="text-base font-semibold">Fontes de Dados</h2>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`mt-6 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <UploadCloud className="h-8 w-8 text-muted" />
        <p className="text-sm font-medium text-foreground">
          Arraste ficheiros PDF ou clique para carregar
        </p>
        <p className="text-xs text-muted">PDF até 20MB por ficheiro</p>
        <label className="glow-border mt-2 cursor-pointer rounded-full px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary">
          Escolher ficheiro
          <input type="file" accept="application/pdf" className="hidden" />
        </label>
      </div>

      <form onSubmit={handleAddLink} className="mt-4 flex items-center gap-2">
        <div className="relative flex-1">
          <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="url"
            value={linkValue}
            onChange={(event) => setLinkValue(event.target.value)}
            placeholder="Adicionar link de site (ex: zentrix.com/sobre)"
            className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
          />
        </div>
        <button
          type="submit"
          aria-label="Adicionar link"
          className="glow-border flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:border-primary"
        >
          <Plus className="h-4 w-4" />
        </button>
      </form>

      <ul className="scrollbar-thin mt-5 max-h-72 space-y-2 overflow-y-auto">
        {sources.map((source) => {
          const Icon = source.kind === "pdf" ? FileText : LinkIcon;

          return (
            <li
              key={source.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/60 px-3 py-2.5"
            >
              <Icon className="h-4 w-4 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{source.name}</p>
                <p className="text-xs text-muted">{source.meta}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-neon-green/10 px-2 py-1 text-xs font-medium text-neon-green">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Treinado
              </span>
              <button
                type="button"
                onClick={() => removeSource(source.id)}
                aria-label={`Remover ${source.name}`}
                className="shrink-0 rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
