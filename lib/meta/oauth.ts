import "server-only";
import {
  parsePages,
  tokenResponseSchema,
  type MetaPage,
} from "@/lib/validations/meta-oauth";

// Facebook Login (for Business) para ligar Instagram e Messenger. O utilizador autoriza no Facebook, a Meta
// devolve um `code` ao nosso callback, e trocamos esse code por tokens, no servidor, com o segredo da app.
// Os tokens nunca passam pelo browser nem por URLs.

// Permissões pedidas. pages_show_list é necessária para listar as páginas do utilizador (/me/accounts).
export const META_OAUTH_SCOPES = [
  "instagram_basic",
  "instagram_manage_messages",
  "pages_manage_metadata",
  "pages_read_engagement",
  "pages_messaging",
  "pages_show_list",
] as const;

// Versão da Graph API usada no login. META_GRAPH_VERSION permite subir sem código.
export const graphVersion = () => process.env.META_GRAPH_VERSION?.trim() || "v23.0";
const version = graphVersion;
export const graphBase = () => `https://graph.facebook.com/${version()}`;
const graph = graphBase;
const TIMEOUT_MS = 15_000;
const MAX_PAGES = 25;

export interface MetaOAuthConfig {
  appId: string;
  appSecret: string;
  // Login for Business: id da "configuração" criada no painel (substitui os scopes). Opcional.
  configId: string | null;
}

export function metaOAuthConfig(): MetaOAuthConfig | null {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;
  return { appId, appSecret, configId: process.env.NEXT_PUBLIC_META_CONFIG_ID?.trim() || null };
}

export const redirectUriFor = (origin: string) => `${origin}/api/meta/oauth`;

export function buildAuthorizeUrl(input: { config: MetaOAuthConfig; redirectUri: string; state: string }) {
  const url = new URL(`https://www.facebook.com/${version()}/dialog/oauth`);
  url.searchParams.set("client_id", input.config.appId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("response_type", "code");
  if (input.config.configId) {
    // Facebook Login for Business: as permissões vêm da configuração do painel.
    url.searchParams.set("config_id", input.config.configId);
  } else {
    url.searchParams.set("scope", META_OAUTH_SCOPES.join(","));
  }
  return url.toString();
}

// O `state` anti-CSRF (cookie + parâmetro) está em oauth-state.ts, que é puro e testável.
export * from "./oauth-state";

// -------------------------------------------------------------------------------------------------- Graph API
export class MetaOAuthError extends Error {
  constructor(
    readonly step: "exchange" | "extend" | "pages",
    readonly status: number,
    readonly code?: number,
  ) {
    super(`meta_oauth_${step}_${status}${code ? `_${code}` : ""}`);
    this.name = "MetaOAuthError";
  }
}

// Os parâmetros (incluindo o segredo da app) vão no CORPO de um POST, nunca no URL: URLs ficam em logs.
async function graphPost(step: "exchange" | "extend", path: string, params: Record<string, string>) {
  const res = await fetch(`${graph()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const code = (json as { error?: { code?: unknown } } | null)?.error?.code;
    throw new MetaOAuthError(step, res.status, typeof code === "number" ? code : undefined);
  }
  const parsed = tokenResponseSchema.safeParse(json);
  if (!parsed.success) throw new MetaOAuthError(step, 502);
  return parsed.data.access_token;
}

// 1) code -> token de curta duração do utilizador
// `redirectUri` só existe no fluxo por redirecionamento; o código do FB.login (JS SDK, Embedded Signup) troca-se sem ele.
export const exchangeCode = (config: MetaOAuthConfig, code: string, redirectUri?: string) =>
  graphPost("exchange", "/oauth/access_token", {
    client_id: config.appId,
    client_secret: config.appSecret,
    ...(redirectUri ? { redirect_uri: redirectUri } : {}),
    code,
  });

// 2) token de curta duração -> Long-Lived Access Token (~60 dias). Os tokens de PÁGINA obtidos com ele não expiram.
export const extendToken = (config: MetaOAuthConfig, shortLived: string) =>
  graphPost("extend", "/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: shortLived,
  });

// 3) páginas (e contas de Instagram ligadas) a que o utilizador deu acesso
export async function fetchPages(longLivedToken: string): Promise<MetaPage[]> {
  const url = new URL(`${graph()}/me/accounts`);
  url.searchParams.set("fields", "id,name,access_token,instagram_business_account{id,username}");
  url.searchParams.set("limit", String(MAX_PAGES));
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${longLivedToken}` }, // no cabeçalho, não no URL
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new MetaOAuthError("pages", res.status);
  return parsePages(json).slice(0, MAX_PAGES);
}

// O id (da app) do utilizador do Facebook que autorizou: serve para o pedido de eliminação de dados da Meta.
export async function fetchMetaUserId(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${graph()}/me?fields=id`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = (await res.json().catch(() => null)) as { id?: unknown } | null;
    return res.ok && typeof json?.id === "string" ? json.id : null;
  } catch {
    return null;
  }
}

// 4) subscreve a página aos eventos de mensagens: sem isto a Meta não envia ao nosso webhook as mensagens dela.
// Devolve false (sem lançar) se falhar: a conta fica ligada, mas há que avisar.
export async function subscribePage(page: MetaPage): Promise<boolean> {
  try {
    const res = await fetch(`${graph()}/${page.id}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${page.access_token}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ subscribed_fields: "messages,messaging_postbacks" }).toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Ao desligar uma página: deixa de receber as mensagens dela (reverte subscribePage). Best-effort, nunca lança.
export async function unsubscribePage(pageId: string, pageToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${graph()}/${pageId}/subscribed_apps`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${pageToken}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}
