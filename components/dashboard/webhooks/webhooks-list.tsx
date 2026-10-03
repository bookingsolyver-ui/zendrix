import { Eye, Webhook } from "lucide-react";
import { WEBHOOK_ENDPOINTS } from "@/components/dashboard/webhooks/webhooks-data";
import { MarketingEmptyState } from "@/components/dashboard/marketing/empty-state";
import { SoonButton } from "@/components/ui/soon-button";

export function WebhooksList() {
  if (WEBHOOK_ENDPOINTS.length === 0) {
    return (
      <MarketingEmptyState
        icon={Webhook}
        title="Nenhum endpoint configurado"
        description="Adicione um endpoint para começar a receber eventos da Zetrix em tempo real."
      />
    );
  }

  return (
    <div className="space-y-3">
      {WEBHOOK_ENDPOINTS.map((endpoint) => (
        <div
          key={endpoint.id}
          className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Webhook className="h-4 w-4 text-primary-2" />
              </span>
              <code className="truncate text-sm text-white/80">{endpoint.url}</code>
              {endpoint.active && (
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  Ativo
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 pl-[46px]">
              {endpoint.events.map((event) => (
                <span
                  key={event}
                  className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[11px] text-white/50"
                >
                  {event}
                </span>
              ))}
            </div>
          </div>

          <SoonButton feature="Ver Logs"
            type="button"
            className="flex shrink-0 items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/30 hover:bg-white/[0.03]"
          >
            <Eye className="h-4 w-4" />
            Ver Logs
          </SoonButton>
        </div>
      ))}
    </div>
  );
}
