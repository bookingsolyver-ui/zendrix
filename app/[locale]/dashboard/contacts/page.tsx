import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { ContactsTable } from "@/components/dashboard/contacts/contacts-table";

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Contactos"
        subtitle="Veja e gira a lista completa de contactos do seu negócio."
      />
      <ContactsTable />
    </>
  );
}
