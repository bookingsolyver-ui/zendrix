// Puro (sem servidor): decide o que fazer quando a Graph API da Meta recusa (ou falha) um envio.
//
//   transient  -> tentar mais tarde (limite de pedidos, instabilidade da Meta, rede)
//   permanent  -> não adianta repetir (janela de 24 h fechada, token inválido, destinatário inválido...)
//
// Repetir um erro permanente só gasta quota; repetir os que indicam SPAM/qualidade (131048, 368...) piora a
// reputação do número: esses nunca são repetidos.

export interface MetaFailureInput {
  httpStatus?: number;
  code?: number; // error.code da Graph API
  network?: boolean; // timeout / sem ligação
}

export interface MetaFailure {
  kind: "transient" | "permanent";
  reason: string;
}

// Limites de pedidos e indisponibilidades temporárias.
const TRANSIENT_CODES = new Set([
  1, // erro desconhecido, normalmente passageiro
  2, // serviço temporariamente indisponível
  4, // limite de chamadas da app
  17, // limite de chamadas do utilizador
  32, // limite de chamadas da página
  341, // limite da aplicação
  613, // limite de chamadas
  80006, // limite do Instagram/Messenger
  80007, // limite do WhatsApp Business
  130429, // WhatsApp: throughput excedido
  131056, // WhatsApp: demasiadas mensagens para o mesmo destinatário (par)
]);

export function classifyMetaFailure({ httpStatus, code, network }: MetaFailureInput): MetaFailure {
  if (network) return { kind: "transient", reason: "network" };
  if (code === 190 || httpStatus === 401) return { kind: "permanent", reason: "token_expired" };
  if (code === 131047 || code === 10 || code === 551) return { kind: "permanent", reason: "window_closed" };
  if (code !== undefined && TRANSIENT_CODES.has(code)) return { kind: "transient", reason: `rate_or_outage_${code}` };
  if (httpStatus === 429 || (httpStatus !== undefined && httpStatus >= 500)) {
    return { kind: "transient", reason: `http_${httpStatus}` };
  }
  return { kind: "permanent", reason: code !== undefined ? `meta_${code}` : `http_${httpStatus ?? "unknown"}` };
}

export const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_SECONDS = 30;

// 30 s, 1 min, 2 min, 4 min, 8 min (com um pouco de aleatoriedade para não repetir tudo ao mesmo tempo).
export function backoffSeconds(retryCount: number, random: () => number = Math.random) {
  const base = BASE_BACKOFF_SECONDS * 2 ** Math.max(0, retryCount - 1);
  return Math.round(base * (0.85 + random() * 0.3));
}
