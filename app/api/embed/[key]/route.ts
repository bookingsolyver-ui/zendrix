import { buildEmbedScript, NOOP_SCRIPT } from "@/lib/popups/embed-script";
import { loadPublicPopup, preflight } from "@/lib/popups/public";

// O script que o cliente cola no seu site: <script async src=".../api/embed/CHAVE.js"></script>. Público e
// com cache curta (alterações ao popup chegam ao site em cerca de um minuto). Popup inexistente, desligado ou de
// uma organização sem plano devolve um script vazio: o site do cliente nunca parte por causa de nós.
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = (await params).key.replace(/\.js$/, "");
  const headers = {
    "Content-Type": "application/javascript; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
  const popup = await loadPublicPopup(key);
  if (!popup) return new Response(NOOP_SCRIPT, { headers: { ...headers, "Cache-Control": "public, max-age=30, s-maxage=30" } });

  // O script chama a API do MESMO servidor de onde foi carregado: a origem deste pedido é, por definição, a certa
  // (mesmo que NEXT_PUBLIC_APP_URL esteja mal configurado ou o site tenha vários domínios).
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0] ?? url.protocol.replace(":", "");
  const origin = `${proto}://${host}`;
  const script = buildEmbedScript({ key, apiBase: `${origin}/api/embed/${key}`, config: popup.config });
  return new Response(script, { headers: { ...headers, "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300" } });
}

export const OPTIONS = (request: Request) => preflight(request.headers.get("origin"));
