import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function GlassCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-shadow hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
          <Icon className="h-4 w-4 text-emerald-400" />
        </span>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>

      <div className="mt-5">{children}</div>
    </div>
  );
}
