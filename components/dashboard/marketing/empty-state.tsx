import type { LucideIcon } from "lucide-react";

export function MarketingEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-20 text-center backdrop-blur-md">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
        <Icon className="h-8 w-8 text-white/30" strokeWidth={1.5} />
      </span>
      <h3 className="mt-5 text-base font-semibold text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-white/50">{description}</p>
    </div>
  );
}
