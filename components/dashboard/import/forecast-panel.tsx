"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/cash/dunning";
import { CARD } from "@/components/dashboard/settings/ui";

// Predictive CFO: previsão do próximo mês e clientes com risco de pagar tarde. Só OWNER e MANAGER.
interface Part { gross: number; expected: number; count: number }
interface Currency { currency: string; receivablesDueNextMonth: Part; overdueRecoverable: Part; proposalsPipeline: Part; expectedTotal: number; atRisk: number }
interface Forecast { month: string; winRate: { rate: number; won: number; lost: number; closed: number }; currencies: Currency[]; riskyClients: { contactId: string; name: string; score: number; tier: string; reason: string }[]; notes: string[] }

const TIER: Record<string, string> = { high: "text-danger", medium: "text-amber-300", low: "text-emerald-400" };
const TIER_LABEL: Record<string, string> = { high: "Alto", medium: "Médio", low: "Baixo" };

export function ForecastPanel() {
  const [data, setData] = useState<Forecast | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    fetch("/api/analytics/forecast", { cache: "no-store" })
      .then(async (res) => (res.ok ? (((await res.json()) as { forecast: Forecast }).forecast) : null))
      .catch(() => null)
      .then((forecast) => alive && setData(forecast));
    return () => { alive = false; };
  }, []);

  if (data === undefined) return <p className="text-sm text-muted">A calcular...</p>;
  if (data === null) return <p role="alert" className="text-sm text-danger">Não foi possível calcular a previsão (só proprietários e gestores têm acesso).</p>;

  const row = (label: string, p: Part, currency: string) => (
    <tr className="border-b border-border/50"><td className="py-2 pr-4">{label} <span className="text-xs text-muted">({p.count})</span></td><td className="py-2 pr-4 text-muted">{formatMoney(p.gross, currency)}</td><td className="py-2 text-right font-medium">{formatMoney(p.expected, currency)}</td></tr>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">Mês previsto: <strong className="text-foreground">{data.month}</strong> · Taxa de ganho histórica: <strong className="text-foreground">{Math.round(data.winRate.rate * 100)}%</strong> ({data.winRate.won} ganhos, {data.winRate.lost} perdidos)</p>

      {data.currencies.length === 0 && <p className="text-sm text-muted">Sem cobranças nem propostas em aberto para prever.</p>}
      {data.currencies.map((c) => (
        <div key={c.currency} className={CARD}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">{c.currency}</h2>
            <p className="text-2xl font-semibold">{formatMoney(c.expectedTotal, c.currency)}<span className="ml-2 text-sm font-normal text-muted">esperado</span></p>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead><tr className="text-left text-muted"><th className="pb-2 font-medium">Origem</th><th className="pb-2 font-medium">Bruto</th><th className="pb-2 text-right font-medium">Esperado</th></tr></thead>
            <tbody>{row("Faturas a vencer no mês", c.receivablesDueNextMonth, c.currency)}{row("Faturas já vencidas", c.overdueRecoverable, c.currency)}{row("Propostas em aberto", c.proposalsPipeline, c.currency)}</tbody>
          </table>
          <p className="mt-3 text-xs text-muted">Em risco de atrasar ou perder: {formatMoney(c.atRisk, c.currency)}</p>
        </div>
      ))}

      {data.riskyClients.length > 0 && (
        <div className={CARD}>
          <h2 className="text-base font-semibold">Clientes com mais risco de pagar tarde</h2>
          <ul className="mt-3 divide-y divide-border/60 text-sm">
            {data.riskyClients.map((r) => (
              <li key={r.contactId} className="flex items-start justify-between gap-4 py-3"><span className="min-w-0">{r.name}<span className="block text-xs text-muted">{r.reason}</span></span><span className={`shrink-0 font-medium ${TIER[r.tier]}`}>{TIER_LABEL[r.tier]} · {Math.round(r.score * 100)}</span></li>
            ))}
          </ul>
        </div>
      )}
      <ul className="list-disc space-y-1 pl-5 text-xs text-muted">{data.notes.map((n) => <li key={n}>{n}</li>)}</ul>
    </div>
  );
}
