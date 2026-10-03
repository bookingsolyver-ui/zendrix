import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AiSettingsBoard } from "@/components/dashboard/ai/settings/ai-settings-board";

export default async function AiSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
        A informação que o agente realmente lê edita-se na{" "}
        <Link
          href="/dashboard/settings/business"
          className="font-semibold underline underline-offset-2"
        >
          Ficha do negócio
        </Link>
        . Os campos desta página ainda não são guardados.
      </div>
      <AiSettingsBoard />
    </>
  );
}
