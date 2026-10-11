import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { BankForm } from "@/components/dashboard/settings/payments/bank-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { loadBankDetails } from "@/lib/payments/bank";
import { groupIban } from "@/lib/payments/bank-format";

export default async function PaymentSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  const canManage = user?.role === "OWNER" || user?.role === "MANAGER";
  const bank = user?.workspace && canManage ? await loadBankDetails(user.workspace.id) : null;

  return (
    <>
      <DashboardPageHeader title="Dados bancários" subtitle="O agente envia estes dados ao cliente que quer pagar por transferência e pede-lhe o comprovativo." />
      {canManage ? (
        <div className="max-w-2xl">
          <BankForm initial={{ bankName: bank?.bankName ?? "", holderName: bank?.holderName ?? "", iban: bank ? groupIban(bank.iban) : "", nib: bank?.nib ?? "", instructions: bank?.instructions ?? "" }} />
        </div>
      ) : (
        <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">Apenas o proprietário e os gestores podem ver e alterar os dados bancários.</p>
      )}
    </>
  );
}
