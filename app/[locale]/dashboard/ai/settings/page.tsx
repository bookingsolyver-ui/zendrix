import { setRequestLocale } from "next-intl/server";
import { AiSettingsBoard } from "@/components/dashboard/ai/settings/ai-settings-board";

export default async function AiSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AiSettingsBoard />;
}
