import type { ReactNode } from "react";
import { ChannelBadge } from "@/components/dashboard/inbox/channel-badge";
import type { ChannelPlatform } from "@/lib/inbox/channels";
import type { ConnectedChannel } from "@/lib/meta/channels-status";

// O botão do cartão: um link (o fluxo OAuth é uma navegação do browser, não um fetch) ou um botão desativado
// com o motivo.
export type ChannelAction =
  | { kind: "link"; node: (className: string) => ReactNode }
  | { kind: "disabled"; label: string; reason: string };

const PRIMARY =
  "neon-btn flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-3 text-sm font-semibold text-background";
const SECONDARY =
  "flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/[0.03]";

export function ChannelCard({
  platform,
  title,
  description,
  connected,
  action,
}: {
  platform: ChannelPlatform;
  title: string;
  description: string;
  connected: ConnectedChannel[];
  action: ChannelAction;
}) {
  const hasAccounts = connected.length > 0;
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-start justify-between gap-3">
        <ChannelBadge platform={platform} size="lg" />
        {hasAccounts && (
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
            {connected.length === 1 ? "1 conta ligada" : `${connected.length} contas ligadas`}
          </span>
        )}
      </div>

      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm text-white/50">{description}</p>

      {hasAccounts && (
        <ul className="mt-4 space-y-1.5 text-xs text-white/60">
          {connected.map((account, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${account.active ? "bg-emerald-400" : "bg-amber-400"}`} />
              Conta …{account.idTail}
              {!account.active && <span className="text-amber-300">(inativa)</span>}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-6">
        {action.kind === "link" ? (
          action.node(hasAccounts ? SECONDARY : PRIMARY)
        ) : (
          <>
            <button type="button" disabled className={`${SECONDARY} cursor-not-allowed opacity-50`}>
              {action.label}
            </button>
            <p className="mt-2 text-xs text-white/40">{action.reason}</p>
          </>
        )}
      </div>
    </div>
  );
}
