"use client";

import { useState, type DragEvent } from "react";
import { BookOpen, CheckCircle2, CloudUpload, FileText, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/dashboard/ai/settings/glass-card";
import { fieldInputClassName } from "@/components/dashboard/ai/settings/field";

const INITIAL_SOURCES = [
  "politica-devolucoes.pdf",
  "catalogo-produtos-2026.pdf",
  "perguntas-frequentes.pdf",
];

export function KnowledgeCard() {
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [sources, setSources] = useState(INITIAL_SOURCES);
  const [isDragging, setIsDragging] = useState(false);

  function analyzeUrl() {
    const trimmed = url.trim();
    if (!trimmed || analyzing) return;

    setAnalyzing(true);
    setTimeout(() => {
      setSources((prev) => [trimmed.replace(/^https?:\/\//, ""), ...prev]);
      setUrl("");
      setAnalyzing(false);
    }, 900);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;

    setSources((prev) => [...files.map((file) => file.name), ...prev]);
  }

  return (
    <GlassCard icon={BookOpen} title="Conhecimento (Knowledge Base)">
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && analyzeUrl()}
          placeholder="Importar do site: https://asuaempresa.com"
          className={`${fieldInputClassName} flex-1`}
        />
        <button
          type="button"
          onClick={analyzeUrl}
          disabled={analyzing}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:border-emerald-500/50 disabled:opacity-60"
        >
          {analyzing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {analyzing ? "A analisar..." : "Analisar URL"}
        </button>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`mt-4 flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          isDragging ? "border-emerald-500/60 bg-emerald-500/5" : "border-white/15"
        }`}
      >
        <CloudUpload className="h-7 w-7 text-white/40" />
        <p className="text-sm text-white/70">Arraste Ficheiros e PDFs, ou clique para carregar</p>
        <label className="cursor-pointer rounded-full border border-white/15 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:border-emerald-500/50">
          Escolher ficheiro
          <input type="file" accept="application/pdf" className="hidden" />
        </label>
      </div>

      <ul className="mt-4 space-y-2">
        {sources.map((source) => (
          <li
            key={source}
            className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
          >
            <FileText className="h-4 w-4 shrink-0 text-white/40" />
            <span className="flex-1 truncate text-sm text-white/80">{source}</span>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
