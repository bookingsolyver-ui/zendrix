// Formato (puro, testável) das imagens e documentos que o cliente envia ao agente.

export const MAX_VISION_BYTES = 4 * 1024 * 1024; // acima disto não se envia ao modelo (custo e limites do pedido)
const VISION_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

// O modelo só aceita estes formatos e tamanhos; o ficheiro é guardado na mesma para a equipa ver.
export function visionEligible(
  mime: string | null | undefined,
  bytes: number,
): boolean {
  const base = (mime ?? "").split(";")[0].trim().toLowerCase();
  return VISION_MIMES.has(base) && bytes > 0 && bytes <= MAX_VISION_BYTES;
}

export function toDataUrl(mime: string, buffer: Buffer): string {
  return `data:${mime.split(";")[0].trim().toLowerCase()};base64,${buffer.toString("base64")}`;
}

// A anotação de contexto que o modelo lê no lugar do marcador "[imagem]" do histórico.
export function inboundLabel(
  type: string | undefined,
  body: string,
): string | null {
  if (type === "image")
    return `[O cliente enviou uma imagem]${captionOf(body, "[imagem]")}`;
  if (type === "document")
    return `[O cliente enviou um documento (PDF ou ficheiro): não consegues ver o conteúdo]${captionOf(body, "[documento]")}`;
  return null;
}

// Se o corpo for mais do que o marcador (uma legenda escrita pelo cliente), conserva-a.
function captionOf(body: string, placeholder: string): string {
  const text = body.trim();
  return text && text !== placeholder ? `: ${text}` : "";
}

// Conteúdo da mensagem do utilizador com a imagem anexada (formato OpenAI/OpenRouter: image_url).
export function withImage(text: string, imageDataUrl: string): ContentPart[] {
  return [
    { type: "text", text },
    { type: "image_url", image_url: { url: imageDataUrl } },
  ];
}
