"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, TrendingDown, X } from "lucide-react";

// <SmartAlertToast />: mostra, no canto superior direito, os alertas por ler da organização (risco de churn, margem,
// pagamentos...). Pergunta a /api/alerts de minuto a minuto (e quando o separador volta a ficar visível). Fechar um
// aviso marca-o como lido: não volta a aparecer. Montagem: ver docs/zetrix-automation.md (uma linha no layout do painel).

interface Alert {
  id: string;
  kind: string;
  severity: "info" | "warning" | "critical" | string;
  title: string;
  body: string;
}

const POLL_MS = 60_000;
const MAX_VISIBLE = 3;

const ICON: Record<string, typeof AlertTriangle> = { margin_risk: TrendingDown, payment_received: CheckCircle2, import_done: CheckCircle2 };
const emoji = (severity: string) => (severity === "critical" ? "🚨 " : severity === "warning" ? "⚠️ " : "");

export function SmartAlertToast() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const dismissed = useRef(new Set<string>()); // fechados neste separador, até o servidor confirmar a leitura

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts", { cache: "no-store" });
      if (!res.ok) return; // sem sessão, sem plano... não é para incomodar
      const data = (await res.json()) as { alerts?: Alert[] };
      setAlerts((data.alerts ?? []).filter((a) => !dismissed.current.has(a.id)));
    } catch {
      /* sem rede: tenta no próximo ciclo */
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => document.visibilityState === "visible" && void load(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const dismiss = useCallback((id: string) => {
    dismissed.current.add(id);
    setAlerts((current) => current.filter((a) => a.id !== id));
    void fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id] }) }).catch(() => {});
  }, []);

  if (alerts.length === 0) return null;
  const visible = alerts.slice(0, MAX_VISIBLE);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3" aria-live="polite">
      {visible.map((alert) => {
        const Icon = ICON[alert.kind] ?? AlertTriangle;
        const tone = alert.severity === "critical" ? "border-danger/60" : alert.severity === "warning" ? "border-amber-400/50" : "border-border";
        return (
          <div key={alert.id} role="status" className={`glow-border pointer-events-auto flex items-start gap-3 rounded-2xl border ${tone} bg-surface-2 p-4 shadow-lg`}>
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{alert.title}</p>
              <p className="mt-1 text-sm text-muted">
                {emoji(alert.severity)}
                {alert.body}
              </p>
            </div>
            <button type="button" onClick={() => dismiss(alert.id)} aria-label="Fechar aviso" className="shrink-0 rounded-md p-1 text-muted transition-colors hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
      {alerts.length > MAX_VISIBLE && <p className="pointer-events-auto self-end rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">+{alerts.length - MAX_VISIBLE} avisos por ler</p>}
    </div>
  );
}
