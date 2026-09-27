export function CardNetworkBadges() {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-bold italic tracking-tight text-blue-700">
        VISA
      </span>
      <span className="flex items-center" aria-hidden>
        <span className="h-4 w-4 rounded-full bg-red-500/80" />
        <span className="-ml-1.5 h-4 w-4 rounded-full bg-amber-400/80 mix-blend-multiply" />
      </span>
    </div>
  );
}
