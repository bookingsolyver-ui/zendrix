export function RevenueChart() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
      <h2 className="text-sm font-semibold text-white">Evolução dos últimos 7 dias</h2>

      <div className="mt-6 flex h-48 items-center justify-center rounded-xl border border-dashed border-white/10">
        <p className="px-6 text-center text-sm text-white/40">
          Sem dados de receita nos últimos 7 dias.
        </p>
      </div>
    </div>
  );
}
