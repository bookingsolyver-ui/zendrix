import { RFM_SEGMENTS, TIER_STYLES } from "@/components/dashboard/analytics/rfm/segment-data";

function withThousands(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function SegmentHeatmap({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Matriz de Segmentação RFM</h2>
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rfm-green" /> Saudável
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rfm-blue" /> Potencial
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rfm-amber" /> Risco
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rfm-dormant" /> Dormente
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {RFM_SEGMENTS.map((segment) => {
          const style = TIER_STYLES[segment.tier];
          const isSelected = segment.id === selectedId;

          return (
            <button
              key={segment.id}
              type="button"
              onClick={() => onSelect(segment.id)}
              className={`flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-transform hover:scale-105 ${style.bg} ${style.border} ${
                segment.span === "wide" ? "col-span-2" : ""
              } ${isSelected ? "ring-2 ring-white/50" : ""}`}
            >
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              <div>
                <p className="text-sm font-semibold text-white">{segment.name}</p>
                <p className={`mt-1 text-xs font-medium ${style.text}`}>
                  {withThousands(segment.customers)} clientes
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
