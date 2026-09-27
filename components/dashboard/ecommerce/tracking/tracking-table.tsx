import { Truck } from "lucide-react";
import {
  SHIPMENTS,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/components/dashboard/ecommerce/tracking/tracking-data";
import { MarketingEmptyState } from "@/components/dashboard/marketing/empty-state";

export function TrackingTable() {
  if (SHIPMENTS.length === 0) {
    return (
      <MarketingEmptyState
        icon={Truck}
        title="Nenhuma encomenda em rastreio"
        description="As encomendas enviadas vão aparecer aqui com o respetivo código de rastreio."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-white/40">
            <th className="px-5 py-3 font-medium">Encomenda</th>
            <th className="px-5 py-3 font-medium">Cliente</th>
            <th className="px-5 py-3 font-medium">Transportadora</th>
            <th className="px-5 py-3 font-medium">Código de Rastreio</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {SHIPMENTS.map((shipment) => (
            <tr
              key={shipment.id}
              className="border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.03]"
            >
              <td className="px-5 py-4 font-mono text-white/70">{shipment.order}</td>
              <td className="px-5 py-4 font-medium text-white">{shipment.customer}</td>
              <td className="px-5 py-4 text-white/70">{shipment.carrier}</td>
              <td className="px-5 py-4 font-mono text-xs text-white/50">{shipment.trackingCode}</td>
              <td className="px-5 py-4">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[shipment.status]}`}
                >
                  {STATUS_LABELS[shipment.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
