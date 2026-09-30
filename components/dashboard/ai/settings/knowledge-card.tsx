"use client";

import { useState, type DragEvent } from "react";
import { BookOpen, CheckCircle2, CloudUpload, FileText } from "lucide-react";
import { GlassCard } from "@/components/dashboard/ai/settings/glass-card";
import { fieldInputClassName } from "@/components/dashboard/ai/settings/field";
import { SoonButton, notifySoon } from "@/components/ui/soon-button";

// There is no storage for knowledge sources yet, so nothing is listed and nothing pretends to upload.
const SOURCES: string[] = [];

export function KnowledgeCard() {
  const [url, setUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    notifySoon("Carregar ficheiros");
  }

  return (
    <GlassCard icon={BookOpen} title="Conhecimento (Knowledge Base)">
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && notifySoon("Analisar URL")}
          placeholder="Importar do site: https://asuaempresa.com"
          className={`${fieldInputClassName} flex-1`}
        />
        <SoonButton
          feature="Analisar URL"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:border-emerald-500/50"
        >
          Analisar URL
        </SoonButton>
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
        <SoonButton
          feature="Carregar ficheiros"
          className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:border-emerald-500/50"
        >
          Escolher ficheiro
        </SoonButton>
      </div>

      {SOURCES.length === 0 && (
        <p className="mt-4 text-center text-xs text-white/40">
          Ainda não adicionou nenhuma fonte de conhecimento.
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {SOURCES.map((source) => (
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
