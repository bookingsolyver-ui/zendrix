import "server-only";
import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/http/origin";
import { pickLocale } from "@/lib/meta/oauth-response";

// Os fluxos de ligação (OAuth) são navegação do browser: o resultado volta à página de definições por URL
// (?connected=1 ou ?error=...), sem tokens nem detalhes do fornecedor.
export function backToSettings(request: Request, locale: string | undefined, page: string, params: Record<string, string>) {
  const url = new URL(`${appOrigin(request)}/${pickLocale(locale)}/dashboard/settings/${page}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}
