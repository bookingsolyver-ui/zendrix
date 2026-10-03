import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { SegmentsManager, type SegmentRow } from "@/components/dashboard/contacts/segments-manager";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { describeRules, parseRules, rulesToFilter, type SegmentRules } from "@/lib/segments/rules";

// As listas predefinidas: também são regras, por isso contam-se da mesma forma.
const BUILT_IN: { name: string; description: string; rules: Partial<SegmentRules> }[] = [
  { name: "Todos os contactos", description: "A lista padrão, com todas as pessoas que já falaram consigo.", rules: {} },
  { name: "Novos (últimos 7 dias)", description: "Contactos criados nos últimos 7 dias.", rules: { createdWithinDays: 7 } },
  { name: "Em conversa", description: "Responderam e estão a ser acompanhados.", rules: { stages: ["ENGAGED"] } },
  { name: "Qualificados", description: "Têm interesse real e dados de contacto confirmados.", rules: { stages: ["QUALIFIED"] } },
  { name: "Pagamento enviado", description: "Receberam um link de pagamento que ainda não foi pago.", rules: { stages: ["PAYMENT_SENT"] } },
  { name: "Clientes", description: "Pagamento confirmado.", rules: { stages: ["WON"] } },
  { name: "Sem mensagens automáticas", description: "Pediram para não receber mais mensagens automáticas.", rules: { optedOut: "yes" } },
];

const countNow = () => new Date();

export default async function ContactsSegmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const workspaceId = user?.workspace?.id;
  const custom = workspaceId ? await prisma.segment.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, description: true, rules: true } }) : [];

  const now = countNow();
  const definitions = [
    ...BUILT_IN.map((item) => ({ id: null, name: item.name, type: (item.name === "Todos os contactos" ? "Lista" : "Dinâmico") as SegmentRow["type"], description: item.description, note: "", rules: null, filter: rulesToFilter(parseRules(item.rules), now) })),
    ...custom.map((item) => {
      const rules = parseRules(item.rules);
      return { id: item.id, name: item.name, type: "Dinâmico" as const, description: describeRules(rules), note: item.description ?? "", rules, filter: rulesToFilter(rules, now) };
    }),
  ];
  const counts = workspaceId ? await Promise.all(definitions.map((item) => prisma.contact.count({ where: { workspaceId, ...item.filter } }))) : definitions.map(() => 0);
  const rows: SegmentRow[] = definitions.map((item, index) => ({ id: item.id, name: item.name, type: item.type, description: item.description, note: item.note, rules: item.rules, members: counts[index] }));

  return (
    <>
      <DashboardPageHeader title="Listas e segmentos" subtitle="Agrupe os contactos por fase e perfil para direcionar os seus envios." />
      <SegmentsManager rows={rows} canManage={user?.role === "OWNER" || user?.role === "MANAGER"} />
      <p className="mt-4 text-sm text-muted">Os segmentos atualizam-se sozinhos à medida que os contactos mudam de fase.</p>
    </>
  );
}
