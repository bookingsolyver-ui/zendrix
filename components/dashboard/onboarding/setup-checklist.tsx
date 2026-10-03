import { ArrowUpRight, Check, Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { EnableAgentButton } from "@/components/dashboard/onboarding/enable-agent-button";
import type { SetupProgress } from "@/lib/onboarding/steps";

// Os primeiros passos, pela ordem em que fazem sentido: canal -> ficha -> IA. Só o passo ATUAL tem botão;
// os seguintes ficam em espera (a IA sem ficha inventava, e sem canal não tem a quem responder).
export function SetupChecklist({ progress, showWhenComplete = false }: { progress: SetupProgress; showWhenComplete?: boolean }) {
  if (progress.complete && !showWhenComplete) return null;

  return (
    <section aria-labelledby="setup-title" className="mb-8 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.04] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="setup-title" className="text-base font-semibold text-white">
            {progress.complete ? "Tudo pronto" : "Primeiros passos"}
          </h2>
          <p className="mt-0.5 text-sm text-white/50">
            {progress.complete
              ? "O canal está ligado, a ficha preenchida e a IA ativa. Já pode atender os clientes."
              : "Três passos e a Zentrix começa a atender os seus clientes."}
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
          {progress.doneCount} de {progress.steps.length}
        </span>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={progress.steps.length} aria-valuenow={progress.doneCount}>
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all" style={{ width: `${(progress.doneCount / progress.steps.length) * 100}%` }} />
      </div>

      <ol className="mt-5 space-y-3">
        {progress.steps.map((step, index) => {
          const isCurrent = step.id === progress.current;
          const locked = !step.done && !isCurrent;
          return (
            <li
              key={step.id}
              className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                isCurrent ? "border-emerald-400/40 bg-white/5" : "border-white/10 bg-white/[0.02]"
              } ${locked ? "opacity-60" : ""}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    step.done ? "bg-emerald-500 text-black" : isCurrent ? "border border-emerald-400 text-emerald-300" : "border border-white/20 text-white/40"
                  }`}
                >
                  {step.done ? <Check className="h-3.5 w-3.5" /> : locked ? <Lock className="h-3 w-3" /> : index + 1}
                </span>
                <div>
                  <p className={`text-sm font-medium ${step.done ? "text-white/60 line-through" : "text-white"}`}>{step.title}</p>
                  {!step.done && <p className="mt-0.5 text-xs text-white/50">{step.description}</p>}
                </div>
              </div>

              {isCurrent &&
                (step.id === "agent" ? (
                  <EnableAgentButton />
                ) : (
                  <Link
                    href={step.href}
                    className="neon-btn flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold text-background"
                  >
                    {step.id === "channel" ? "Ligar canal" : "Preencher ficha"}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                ))}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
