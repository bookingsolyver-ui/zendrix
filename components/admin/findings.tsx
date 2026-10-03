import type { Finding, Severity } from "@/lib/admin/diagnose";

const STYLE: Record<Severity, { box: string; pill: string; label: string }> = {
  critical: { box: "border-red-500/30 bg-red-500/5", pill: "bg-red-500/15 text-red-300", label: "Crítico" },
  warning: { box: "border-amber-400/30 bg-amber-400/5", pill: "bg-amber-400/15 text-amber-300", label: "Atenção" },
  info: { box: "border-white/10 bg-white/[0.02]", pill: "bg-white/10 text-white/60", label: "Informação" },
  ok: { box: "border-emerald-500/30 bg-emerald-500/5", pill: "bg-emerald-500/15 text-emerald-300", label: "Tudo bem" },
};

// A lista de problemas, com a explicação e o passo seguinte. Server Component: só recebe dados simples.
export function Findings({ findings }: { findings: Finding[] }) {
  return (
    <div className="space-y-3">
      {findings.map((finding) => {
        const style = STYLE[finding.severity];
        return (
          <article key={finding.id} className={`rounded-2xl border p-5 ${style.box}`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.pill}`}>{style.label}</span>
              <h3 className="text-sm font-semibold text-white">{finding.title}</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              <span className="font-medium text-white/90">O que se passa: </span>
              {finding.meaning}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              <span className="font-medium text-white/90">O que fazer: </span>
              {finding.fix}
            </p>
            {finding.evidence && <p className="mt-2 font-mono text-xs text-white/40">{finding.evidence}</p>}
          </article>
        );
      })}
    </div>
  );
}
