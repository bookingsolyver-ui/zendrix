import "server-only";

// O endereço público da app, para os links que se enviam a clientes finais (ex.: onde o Stripe devolve quem
// pagou). Fora de um pedido (a IA corre depois de responder à Meta) não há "origem do pedido": vem do ambiente.
// null = não configurado (as funcionalidades que dependem dele ficam desligadas em vez de enviarem um link errado).
export function publicOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (configured?.startsWith("https://") || configured?.startsWith("http://localhost")) return configured;
  return null;
}
