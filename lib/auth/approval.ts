// Aprovação manual de contas novas. Puro (sem servidor).

// Por omissão, os registos novos ficam por aprovar. REQUIRE_ACCOUNT_APPROVAL=false aprova-os automaticamente
// (para quem não quer moderar). Qualquer outro valor, ou a falta dele, mantém a aprovação obrigatória.
// (Quem chama passa o valor da variável: este módulo é puro e não lê o ambiente.)
export function approvalRequired(value: string | undefined): boolean {
  return value?.trim().toLowerCase() !== "false";
}

export const initialApprovalStatus = (required: boolean) => (required ? ("PENDING_APPROVAL" as const) : ("APPROVED" as const));
