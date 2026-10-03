import { ListChecks } from "lucide-react";

export function HowItWorks({ steps }: { steps: string[] }) {
  return (
    <section className="glow-border rounded-2xl p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ListChecks className="h-4 w-4 text-neon-green" />
        Como funciona
      </h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3 text-sm text-muted">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-foreground">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </section>
  );
}
