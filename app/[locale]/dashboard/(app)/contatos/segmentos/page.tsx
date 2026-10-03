import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { SegmentsManager, type SegmentRow } from "@/components/dashboard/contacts/segments-manager";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { BUILT_IN_SEGMENTS } from "@/lib/segments/builtin";
import { describeRules, parseRules, rulesToFilter } from "@/lib/segments/rules";

const countNow = () => new Date();

export default async function ContactsSegmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const workspaceId = user?.workspace?.id;
  const custom = workspaceId ? await prisma.segment.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, description: true, rules: true } }) : [];

  const now = countNow();
  const definitions = [
    ...BUILT_IN_SEGMENTS.map((item) => ({ id: null, name: item.name, type: item.type as SegmentRow["type"], description: item.description, note: "", rules: null, filter: rulesToFilter(item.rules, now) })),
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
