import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { ReceivablesPanel } from "@/components/dashboard/import/receivables-panel";
import { getCurrentUser } from "@/lib/auth/current-user";
import { contactLabel } from "@/lib/inbox/display";
import { prisma } from "@/lib/prisma";

// Cash-Collector: página nova (ver docs/kwanza-expansion.md para o link).
export default async function ReceivablesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  const contacts = user?.workspace ? await prisma.contact.findMany({ where: { workspaceId: user.workspace.id }, orderBy: { createdAt: "desc" }, take: 500, select: { id: true, name: true, waId: true, platform: true } }) : [];
  return (
    <div>
      <DashboardPageHeader title="Cobranças" subtitle="Faturas por receber. Depois do vencimento, lembramos o cliente por WhatsApp com um tom que escala." />
      <ReceivablesPanel contacts={contacts.map((c) => ({ id: c.id, label: contactLabel(c.name, c.waId, c.platform) }))} />
    </div>
  );
}
