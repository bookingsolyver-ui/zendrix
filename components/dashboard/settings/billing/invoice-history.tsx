import { Download } from "lucide-react";
import { SoonButton } from "@/components/ui/soon-button";

type Invoice = {
  id: string;
  date: string;
  amount: string;
  status: "paid";
};

// No billing system yet, so there are no invoices.
const INVOICES: Invoice[] = [];

export function InvoiceHistory() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
      <h2 className="text-sm font-semibold text-white">Histórico de Faturas</h2>

      {INVOICES.length === 0 ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 py-10 text-center">
          <p className="text-sm text-white/50">Ainda não existem faturas emitidas.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/40">
                <th className="py-2.5 font-medium">Data</th>
                <th className="py-2.5 font-medium">Valor</th>
                <th className="py-2.5 font-medium">Status</th>
                <th className="py-2.5" />
              </tr>
            </thead>
            <tbody>
              {INVOICES.map((invoice) => (
                <tr key={invoice.id} className="border-b border-white/5 last:border-b-0">
                  <td className="py-3 text-white/70">{invoice.date}</td>
                  <td className="py-3 font-medium text-white">{invoice.amount}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                      Pago
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <SoonButton feature="Descarregar fatura"
                      type="button"
                      aria-label="Descarregar fatura"
                      className="rounded-md p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
                    >
                      <Download className="h-4 w-4" />
                    </SoonButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
