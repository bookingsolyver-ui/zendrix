import { Megaphone, MoreHorizontal } from "lucide-react";
import { CAMPAIGNS, STATUS_LABELS, STATUS_STYLES } from "@/components/dashboard/marketing/campaigns/campaigns-data";
import { MarketingEmptyState } from "@/components/dashboard/marketing/empty-state";

export function CampaignsTable() {
  if (CAMPAIGNS.length === 0) {
    return (
      <MarketingEmptyState
        icon={Megaphone}
        title="Nenhuma campanha ainda"
        description="Crie a sua primeira campanha e comece a vender diretamente pelo WhatsApp."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
      <table className="w-full min-w-[600px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-white/40">
            <th className="px-5 py-3 font-medium">Campanha</th>
            <th className="px-5 py-3 font-medium">Estado</th>
            <th className="px-5 py-3 font-medium">Métrica</th>
            <th className="px-5 py-3 font-medium">Data</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {CAMPAIGNS.map((campaign) => (
            <tr
              key={campaign.id}
              className="border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.03]"
            >
              <td className="px-5 py-4 font-medium text-white">{campaign.name}</td>
              <td className="px-5 py-4">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[campaign.status]}`}
                >
                  {STATUS_LABELS[campaign.status]}
                </span>
              </td>
              <td className="px-5 py-4 text-white/70">{campaign.metricLabel ?? "—"}</td>
              <td className="px-5 py-4 text-white/50">{campaign.date ?? "—"}</td>
              <td className="px-5 py-4 text-right">
                <button
                  type="button"
                  aria-label="Mais opções"
                  className="rounded-md p-1 text-white/30 hover:bg-white/10 hover:text-white"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
