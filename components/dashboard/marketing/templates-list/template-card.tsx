import { MessageSquareText } from "lucide-react";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  type MessageTemplate,
} from "@/components/dashboard/marketing/templates-list/templates-data";

export function TemplateCard({ template }: { template: MessageTemplate }) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-200 hover:scale-[1.02] hover:border-emerald-500/30 hover:bg-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/10">
            <MessageSquareText className="h-4 w-4 text-[#25D366]" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-medium text-white">{template.name}</p>
            <p className="text-xs text-white/40">{template.language}</p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[template.status]}`}
        >
          {STATUS_LABELS[template.status]}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-white/5 bg-black/30 p-3.5">
        <p className="text-sm leading-relaxed text-white/70">{template.preview}</p>
      </div>
    </div>
  );
}
