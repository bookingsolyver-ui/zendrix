import "server-only";

// Defesa contra pedidos feitos a partir de outro site com o cookie de sessão do utilizador (CSRF).
// Um pedido de browser traz o cabeçalho Origin; se existir, tem de ser o nosso próprio site.
// Sem Origin (curl, servidor a servidor) não há cookie de browser em jogo: deixa-se passar.
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

// Site público da app, para os URLs de regresso do Stripe. NEXT_PUBLIC_APP_URL se existir; senão a origem
// do próprio pedido.
export function appOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  return configured || new URL(request.url).origin;
}
