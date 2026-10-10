import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { ProposalsPanel } from "@/components/dashboard/import/proposals-panel";
import { getCurrentUser } from "@/lib/auth/current-user";
import { contactLabel } from "@/lib/inbox/display";
import { prisma } from "@/lib/prisma";

// Kwanza Flow Portal (gestor): página nova (ver docs/zetrix-clevel.md para o link).
export default async function ProposalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  const contacts = user?.workspace ? await prisma.contact.findMany({ where: { workspaceId: user.workspace.id }, orderBy: { createdAt: "desc" }, take: 500, select: { id: true, name: true, waId: true, platform: true } }) : [];
  return (
    <div>
      <DashboardPageHeader title="Propostas" subtitle="Envie um link em vez de um PDF: o cliente vê e aprova no telemóvel." />
      <ProposalsPanel contacts={contacts.map((c) => ({ id: c.id, label: contactLabel(c.name, c.waId, c.platform) }))} />
    </div>
  );
}
