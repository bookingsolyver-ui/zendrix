import { FileText } from "lucide-react";
import type { Doc } from "@/components/dashboard/crm/docs/docs-data";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function DocCard({ doc }: { doc: Doc }) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-200 hover:scale-[1.02] hover:border-emerald-500/30 hover:bg-white/10">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
        <FileText className="h-5 w-5 text-primary-2" />
      </span>

      <h3 className="mt-4 text-sm font-semibold text-white">{doc.title}</h3>
      <p className="mt-1 text-xs text-white/40">Atualizado {doc.updatedAt}</p>

      <div className="mt-5 flex items-center gap-2.5 border-t border-white/5 pt-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white">
          {initials(doc.editor)}
        </span>
        <span className="text-xs text-white/50">Editado por {doc.editor}</span>
      </div>
    </div>
  );
}
