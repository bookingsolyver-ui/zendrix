// Validação do remetente (EMAIL_FROM). Pura (sem servidor): testável. Um remetente mal formado ou de um domínio que
// não é o da app faz o Resend recusar (403) ou os servidores de correio marcarem como spam.

export type FromCheck =
  | { ok: true; address: string; domain: string; name: string | null }
  | { ok: false; reason: "empty" | "format" };

const ADDRESS = /^[A-Za-z0-9._%+-]+@((?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})$/;

// Aceita "no-reply@dominio.com" e "Nome <no-reply@dominio.com>". Recusa mudanças de linha e carateres de controlo
// (injeção de cabeçalhos) e mais do que um endereço.
export function parseFrom(raw: string | null | undefined): FromCheck {
  const value = raw?.trim() ?? "";
  if (!value) return { ok: false, reason: "empty" };
  if (/[\u0000-\u001f\u007f]/.test(value) || value.includes(",") || value.includes(";")) return { ok: false, reason: "format" };

  const angle = value.match(/^(.*)<([^<>]+)>\s*$/);
  const addressPart = (angle ? angle[2] : value).trim();
  const name = angle ? angle[1].trim().replace(/^"|"$/g, "").trim() || null : null;
  const match = addressPart.match(ADDRESS);
  if (!match) return { ok: false, reason: "format" };
  return { ok: true, address: addressPart.toLowerCase(), domain: match[1].toLowerCase(), name };
}

// O domínio da app (sem "www."), a partir de NEXT_PUBLIC_APP_URL. null se não for um URL válido.
export function appDomain(appUrl: string | null | undefined): string | null {
  try {
    return appUrl ? new URL(appUrl).hostname.replace(/^www\./, "").toLowerCase() : null;
  } catch {
    return null;
  }
}

// O remetente é de outro domínio que não o da app (nem um subdomínio dele)? Só um aviso: pode ser de propósito,
// mas é a causa mais comum de "domínio não verificado".
export function domainMismatch(fromDomain: string, appUrl: string | null | undefined): boolean {
  const app = appDomain(appUrl);
  return app !== null && fromDomain !== app && !fromDomain.endsWith(`.${app}`);
}

// Tira endereços de e-mail e encurta: o motivo que o Resend dá pode citar o destinatário.
export const safeDetail = (...parts: unknown[]): string =>
  parts
    .filter((p): p is string => typeof p === "string" && p.length > 0)
    .join(": ")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, "<email>")
    .slice(0, 200);
