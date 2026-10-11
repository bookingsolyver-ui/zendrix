// Dados bancários: validação e texto para o cliente. Puro (sem servidor): testável.
// A mensagem leva SEMPRE a linha de marca (BANK_MARKER): é assim que se sabe que a um cliente já foram enviados os
// dados, e por isso que uma imagem recebida a seguir é um possível comprovativo.

export const BANK_MARKER = "💳 Dados para transferência bancária";

export interface BankInput {
  bankName: string;
  holderName: string;
  iban: string;
  nib?: string | null;
  instructions?: string | null;
}

export const normalizeIban = (raw: string) => raw.replace(/[\s.-]/g, "").toUpperCase();

// IBAN: 2 letras + 2 dígitos de controlo + até 30 carateres alfanuméricos (o de Angola tem 25: AO06 + 21 dígitos).
// Valida o formato e o dígito de controlo (mod 97), para apanhar gralhas antes de as enviar a clientes.
export function isValidIban(raw: string): boolean {
  const iban = normalizeIban(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const value = char >= "A" ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of value) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

export type BankIssue = "bank_name" | "holder_name" | "iban" | "nib";

export function validateBank(input: BankInput): BankIssue[] {
  const issues: BankIssue[] = [];
  if (input.bankName.trim().length < 2 || input.bankName.length > 80) issues.push("bank_name");
  if (input.holderName.trim().length < 2 || input.holderName.length > 120) issues.push("holder_name");
  if (!isValidIban(input.iban)) issues.push("iban");
  if (input.nib && !/^\d{21}$/.test(input.nib.replace(/\s/g, ""))) issues.push("nib"); // NIB angolano: 21 dígitos
  return issues;
}

// IBAN agrupado de 4 em 4 para ler e copiar com facilidade.
export const groupIban = (iban: string) => normalizeIban(iban).replace(/(.{4})/g, "$1 ").trim();

export function formatBankMessage(bank: BankInput, order?: { itemName?: string | null; amountLabel?: string | null }): string {
  const lines = [BANK_MARKER, ""];
  if (order?.itemName) lines.push(`Produto: ${order.itemName}`);
  if (order?.amountLabel) lines.push(`Valor: ${order.amountLabel}`);
  if (order?.itemName || order?.amountLabel) lines.push("");
  lines.push(`Banco: ${bank.bankName.trim()}`, `Titular: ${bank.holderName.trim()}`, `IBAN: ${groupIban(bank.iban)}`);
  if (bank.nib?.trim()) lines.push(`NIB: ${bank.nib.replace(/\s/g, "")}`);
  if (bank.instructions?.trim()) lines.push("", bank.instructions.trim());
  lines.push("", "Depois de pagar, envie-nos aqui o comprovativo (foto ou PDF) para validarmos.");
  return lines.join("\n");
}

// O produto e o valor que a mensagem de dados bancários indicava (para o painel mostrar o que está a ser pago).
export function parseOrder(body: string): { itemName: string | null; amountLabel: string | null } {
  const pick = (label: string) => body.match(new RegExp(`^${label}: (.+)$`, "m"))?.[1]?.trim().slice(0, 120) ?? null;
  return { itemName: pick("Produto"), amountLabel: pick("Valor") };
}

export const isBankMessage = (body: string) => body.startsWith(BANK_MARKER);

export const PROOF_RECEIVED_TEXT = "Recebemos o seu comprovativo. Por favor, aguarde um momento enquanto validamos o pagamento.";
export const PAYMENT_APPROVED_TEXT = "Pagamento confirmado! ✅ Obrigado pela sua compra. Se precisar de mais alguma coisa, estamos aqui.";
export const paymentRejectedText = (note: string | null) =>
  `Não conseguimos validar o seu comprovativo${note?.trim() ? `: ${note.trim()}` : ""}. Pode enviar-nos outro, por favor, ou falar com a nossa equipa.`;

// Tipos de mensagem que podem ser um comprovativo.
export const isProofMessageType = (type: string) => type === "image" || type === "document";
