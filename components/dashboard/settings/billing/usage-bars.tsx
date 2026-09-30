export type UsageItem = {
  label: string;
  value: string;
  hint?: string;
};

export function UsageBars({ items }: { items: UsageItem[] }) {
  // Plan limits depend on a subscription that does not exist yet, so this shows real usage only.
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
      <h2 className="text-sm font-semibold text-white">Utilização</h2>

      <div className="mt-5 divide-y divide-white/5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 py-3 text-sm">
            <div>
              <span className="text-white/70">{item.label}</span>
              {item.hint && <p className="mt-0.5 text-xs text-white/40">{item.hint}</p>}
            </div>
            <span className="shrink-0 font-medium text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
