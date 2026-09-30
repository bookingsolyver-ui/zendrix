import { Lightbulb, Sparkles, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TIER_STYLES, type RfmSegment } from "@/components/dashboard/analytics/rfm/segment-data";

function withThousands(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function StrategicPanel({ segment }: { segment: RfmSegment }) {
  const style = TIER_STYLES[segment.tier];

  return (
    <div className="h-fit rounded-2xl border border-white/10 bg-white/[0.02] p-6 lg:sticky lg:top-6">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.bg} ${style.text}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
        Segmento selecionado
      </span>

      <h2 className="mt-4 text-2xl font-semibold text-white">{segment.name}</h2>

      <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-white/60">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
        <span>
          {withThousands(segment.customers)} clientes. Geraram{" "}
          <span className="font-semibold text-white">{segment.revenue90d}</span> nos últimos 90
          dias.
        </span>
      </p>

      <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/40">
          <Lightbulb className="h-3.5 w-3.5" />
          Dica Estratégica
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/70">{segment.tip}</p>
      </div>

      <Link
        href="/dashboard/marketing/automations"
        className="neon-green-btn mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-green-500 py-3 text-sm font-semibold text-background hover:bg-green-400"
      >
        <Sparkles className="h-4 w-4" />
        Criar Automação para este Segmento
      </Link>
    </div>
  );
}
