import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { ContactsTable, type ContactRow } from "@/components/dashboard/contacts/contacts-table";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const dateFormat = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Lisbon",
});

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
        subtitle="Veja e gira a lista completa de contactos do seu negócio."
      />
      <ContactsTable contacts={contacts} />
    </>
  );
}
