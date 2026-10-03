import "server-only";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { appOrigin } from "@/lib/http/origin";

export const pickLocale = (value: string | null | undefined) =>
  routing.locales.find((l) => l === value) ?? routing.defaultLocale;

// O fluxo OAuth é navegação do browser (não fetch): os resultados e os erros voltam à página de canais, por
// URL, como ?connected=instagram&count=2 ou ?error=forbidden. Nunca leva tokens nem detalhes da Meta.
export function backToChannels(request: Request, locale: string, params: Record<string, string>) {
  const url = new URL(`${appOrigin(request)}/${locale}/dashboard/settings/channels`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}
