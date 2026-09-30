import { GripVertical } from "lucide-react";
import { TOOLBOX_GROUPS } from "@/components/dashboard/automations/flow-data";
import { SoonButton } from "@/components/ui/soon-button";

export function ToolboxPanel() {
  return (
    <aside className="flex w-full shrink-0 flex-col overflow-y-auto border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur md:h-full md:w-[280px] md:border-b-0 md:border-r">
      <div className="border-b border-white/5 px-5 py-5">
        <p className="text-sm font-semibold text-white">Blocos de Automação</p>
        <p className="mt-1 text-xs text-white/40">Arraste um bloco para o canvas</p>
      </div>

      <div className="space-y-6 px-4 py-5">
        {TOOLBOX_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-white/30">
              {group.label}
            </p>
            <div className="mt-2.5 space-y-1.5">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <SoonButton feature={item.label}
                    key={item.label}
                    type="button"
                    className="group flex w-full cursor-grab items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition-all hover:ring-1 hover:ring-emerald-500/50 active:cursor-grabbing"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-white/50 group-hover:text-emerald-400" />
                    <span className="flex-1 text-sm text-white/80">{item.label}</span>
                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-white/20" />
                  </SoonButton>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
