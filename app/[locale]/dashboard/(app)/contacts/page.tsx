import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { ContactsStats } from "@/components/dashboard/contacts/stats-strip";
import { ContactsQuickLinks } from "@/components/dashboard/contacts/quick-links";
import { HowItWorks } from "@/components/dashboard/marketing/how-it-works";
import { ContactsTable, type ContactRow } from "@/components/dashboard/contacts/contacts-table";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const dateFormat = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Lisbon",
});

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const rows = user?.workspace
    ? await prisma.contact.findMany({
        where: { workspaceId: user.workspace.id },
        orderBy: { createdAt: "desc" },
        take: 1000,
        select: { id: true, name: true, waId: true, createdAt: true, email: true, leadStage: true, optedOutAt: true },
      })
    : [];

  const workspaceId = user?.workspace?.id;
  const weekAgo = daysAgo(7);
  const [total, newThisWeek, customers, optedOut] = workspaceId
    ? await Promise.all([
        prisma.contact.count({ where: { workspaceId } }),
        prisma.contact.count({ where: { workspaceId, createdAt: { gte: weekAgo } } }),
        prisma.contact.count({ where: { workspaceId, leadStage: "WON" } }),
        prisma.contact.count({ where: { workspaceId, optedOutAt: { not: null } } }),
      ])
    : [0, 0, 0, 0];

  const contacts: ContactRow[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: `+${row.waId}`,
    registeredAt: dateFormat.format(row.createdAt),
    email: row.email,
    stage: row.leadStage,
    optedOut: Boolean(row.optedOutAt),
  }));

  return (
    <>
      <DashboardPageHeader
        title="Contactos"
        subtitle="Gira todos os contactos do seu negócio, de todos os canais."
      />
      <ContactsStats total={total} newThisWeek={newThisWeek} customers={customers} optedOut={optedOut} />
      <ContactsTable contacts={contacts} />
      <ContactsQuickLinks />
      <div className="mt-8">
        <HowItWorks
          steps={[
            "Os contactos entram sozinhos quando escrevem para si",
            "A IA qualifica cada um e atualiza a fase",
            "Exporte a lista em CSV quando precisar",
            "Quem pede para parar deixa de receber mensagens automáticas",
          ]}
        />
      </div>
    </>
  );
}
