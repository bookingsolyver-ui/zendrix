import { WhatsappEmptyState } from "@/components/dashboard/overview/whatsapp-empty-state";

// There are no message or contact tables yet, so the real value of every counter is 0.
// Replace these with database counts when those tables exist; never with placeholder numbers.
const METRICS = [
  { label: "Mensagens Hoje", value: "0", hint: "Sem mensagens ainda" },
  { label: "Novos Contactos", value: "0", hint: "Sem contactos ainda" },
  { label: "Taxa de Leitura", value: "—", hint: "Sem mensagens para calcular" },
  { label: "IA Respondeu", value: "0", hint: "Sem respostas automáticas ainda", highlight: true },
];

// The connection state comes from the database (SocialIntegration), decided on the server.
export function WhatsappGate({ connected }: { connected: boolean }) {
  if (!connected) return <WhatsappEmptyState />;

  return (
    <div>
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        WhatsApp Conectado
      </span>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((m) => (
          <div
            key={m.label}
            className={`rounded-2xl border p-5 ${
              m.highlight
                ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/20 to-emerald-900/20"
                : "border-white/10 bg-white/5"
            }`}
          >
            <p className="text-sm text-white/60">{m.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{m.value}</p>
            <p className={`mt-1 text-xs ${m.highlight ? "text-emerald-400" : "text-white/40"}`}>
              {m.hint}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
