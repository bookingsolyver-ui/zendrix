// Organização dos anexos dos clientes em «pastas». Puro (sem I/O): testável.
//
//   <workspaceId>/comprovativos/<Nome>_<timestamp>_<id>.<ext>   comprovativos de pagamento
//   <workspaceId>/anexos_gerais/<Nome>_<timestamp>_<id>.<ext>   fotos de peças, documentos, outros
//
// O prefixo do workspace é o que isola um cliente do outro (signedMediaUrls só assina o que lhe pertence) e mantém
// a estrutura de DOIS níveis que deleteWorkspaceMedia apaga ao eliminar a conta.

export type AttachmentCategory = "comprovativos" | "anexos_gerais";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
  "text/csv": "csv",
};

export function extensionFor(mime: string | null | undefined): string {
  const base = (mime ?? "").split(";")[0].trim().toLowerCase();
  return MIME_EXTENSIONS[base] ?? "bin";
}

// "João da Silva" -> "Joao_da_Silva". Só letras e números ASCII: nunca separadores de pasta nem ".." no caminho.
export function safeNameSegment(
  name: string | null | undefined,
  fallback = "cliente",
  max = 40,
): string {
  const cleaned = (name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, max)
    .replace(/_+$/g, "");
  return cleaned || fallback;
}

// O que se arquiva: um comprovativo (capturado depois de enviarmos os dados bancários) vai para comprovativos/;
// tudo o resto para anexos_gerais/.
export function categoryFor(isPaymentProof: boolean): AttachmentCategory {
  return isPaymentProof ? "comprovativos" : "anexos_gerais";
}

export function attachmentPath(input: {
  workspaceId: string;
  category: AttachmentCategory;
  // Nome do cliente (ou o número, se ainda não tem nome).
  customerName: string | null | undefined;
  // Quando a mensagem foi enviada.
  at: Date;
  waMessageId: string;
  mime: string | null | undefined;
}): string {
  const seconds = Math.floor(input.at.getTime() / 1000);
  // O fim do id da mensagem desempata várias fotos do mesmo cliente no mesmo segundo.
  const tail = safeNameSegment(input.waMessageId, "msg", 64).slice(-6);
  const name = safeNameSegment(input.customerName);
  return `${input.workspaceId}/${input.category}/${name}_${seconds}_${tail}.${extensionFor(input.mime)}`;
}
