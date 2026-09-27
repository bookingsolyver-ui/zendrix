import { TrendingUp } from "lucide-react";
import {
  STATUS_LABELS,
  STATUS_STYLES,
  type StorePopup,
} from "@/components/dashboard/marketing/popups/popups-data";

export function PopupCard({ popup }: { popup: StorePopup }) {
  const Icon = popup.icon;

  return (
    <div className="gamified-glow overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-transform duration-200 hover:scale-[1.02]">
      <div
        className={`flex h-40 items-center justify-center bg-gradient-to-br ${popup.gradient}`}
      >
        <Icon className="h-16 w-16 text-white/70" strokeWidth={1.25} />
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white">{popup.name}</h3>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[popup.status]}`}
          >
            {STATUS_LABELS[popup.status]}
          </span>
        </div>

        {popup.metric && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-400">
            <TrendingUp className="h-3.5 w-3.5" />
            {popup.metric}
          </p>
        )}

        <button
          type="button"
          className="mt-5 w-full rounded-full border border-white/15 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/30 hover:bg-white/[0.03]"
        >
          Editar
        </button>
      </div>
    </div>
  );
}
