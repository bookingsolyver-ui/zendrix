import { setRequestLocale } from "next-intl/server";
import { requireSuperAdminPage } from "@/lib/superadmin/guard";
import { loadEvents } from "@/lib/superadmin/metrics";

const TONE: Record<string, string> = { critical: "text-danger", warning: "text-amber-300", info: "text-muted" };

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireSuperAdminPage();
  const events = await loadEvents();
  return (
    <div>
      <h1 className="text-xl font-semibold">Erros e alertas</h1>
      <p className="mt-1 text-xs text-muted">Os 100 mais recentes. «Avisado» = foi enviado ao Discord/Slack (o mesmo erro só avisa uma vez por 10 min).</p>
      <div className="glow-border mt-4 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="border-b border-border text-left text-muted"><th className="px-4 py-3 font-medium">Quando</th><th className="px-4 py-3 font-medium">Gravidade</th><th className="px-4 py-3 font-medium">Tipo</th><th className="px-4 py-3 font-medium">Organização</th><th className="px-4 py-3 font-medium">Rota</th><th className="px-4 py-3 font-medium">Detalhe</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-b border-border/50 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-muted">{e.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className={`px-4 py-3 font-medium ${TONE[e.severity] ?? ""}`}>{e.severity}{e.alerted ? " ✓" : ""}</td>
                <td className="px-4 py-3">{e.kind}</td><td className="px-4 py-3 text-muted">{e.workspaceId ?? "—"}</td><td className="px-4 py-3">{e.route}</td><td className="max-w-md break-words px-4 py-3 text-muted">{e.message}</td>
              </tr>
            ))}
            {events.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted">Sem eventos. Tudo calmo.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
