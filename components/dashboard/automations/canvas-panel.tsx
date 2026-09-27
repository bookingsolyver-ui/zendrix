import { FLOW_NODES, type FlowNodeId } from "@/components/dashboard/automations/flow-data";

export function CanvasPanel({
  selectedNodeId,
  onSelectNode,
}: {
  selectedNodeId: FlowNodeId;
  onSelectNode: (id: FlowNodeId) => void;
}) {
  return (
    <div className="bg-dot-grid relative flex-1 overflow-auto bg-[#08090c]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(34,197,94,0.10),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(124,92,255,0.08),transparent_70%)]"
      />

      <div className="relative flex min-h-full flex-col items-center gap-0 px-6 py-16">
        {FLOW_NODES.map((node, index) => {
          const Icon = node.icon;
          const isSelected = node.id === selectedNodeId;

          return (
            <div key={node.id} className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => onSelectNode(node.id)}
                className={`w-72 rounded-xl border border-white/10 bg-white/5 p-4 text-left shadow-xl shadow-black/40 backdrop-blur-md transition-all hover:border-white/20 ${
                  isSelected ? `ring-2 ${node.ringClassName}` : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${node.iconClassName}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">
                      {node.eyebrow}
                    </p>
                    <p className="truncate text-sm font-medium text-white">{node.title}</p>
                  </div>
                </div>

                {node.active && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.6)]" />
                    <span className="text-xs font-medium text-emerald-400">Ativo</span>
                  </div>
                )}
              </button>

              {index < FLOW_NODES.length - 1 && (
                <div className="flex h-14 w-px flex-col items-center bg-gradient-to-b from-white/20 to-white/5">
                  <span className="mt-auto h-2 w-2 -translate-x-[3.5px] translate-y-1 rotate-45 border-b border-r border-white/20" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
