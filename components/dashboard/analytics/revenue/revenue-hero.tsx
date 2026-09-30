export function RevenueHero() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-md sm:p-9">
      <p className="text-sm font-medium text-white/50">Receita Total Gerada</p>
      <div className="mt-3 flex flex-wrap items-baseline gap-4">
        <p className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Kz 0</p>
      </div>
      <p className="mt-2 text-sm text-white/40">Ainda não há receita registada.</p>
    </div>
  );
}
