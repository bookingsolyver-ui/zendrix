import type { ReactNode } from "react";

// Peças partilhadas do painel de administração. Server Components: só recebem texto, números e elementos.
export function Stat({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: string; tone?: "default" | "warn" | "bad" | "good" }) {
  const color = tone === "bad" ? "text-red-300" : tone === "warn" ? "text-amber-300" : tone === "good" ? "text-emerald-300" : "text-white";
  return (
    <div className="glow-border rounded-2xl p-5">
      <p className="text-xs font-medium text-white/50">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "good" | "warn" | "bad" }) {
  const style = tone === "good" ? "bg-emerald-500/10 text-emerald-400" : tone === "warn" ? "bg-amber-400/15 text-amber-300" : tone === "bad" ? "bg-red-500/10 text-red-300" : "bg-white/10 text-white/60";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>{children}</span>;
}

export const TABLE = "w-full min-w-[640px] border-collapse text-sm";
export const TH = "px-4 py-3 text-left font-medium text-white/40";
export const TD = "px-4 py-3";

export const dateTime = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" });
export const dateOnly = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Lisbon" });
export const money = (minor: number, currency: string) => new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(minor / 100);
export const subTone = (status: string, blocked = false) => (blocked ? "bad" : status === "active" ? "good" : status === "trialing" ? "default" : status === "past_due" ? "warn" : "bad") as "good" | "default" | "warn" | "bad";
