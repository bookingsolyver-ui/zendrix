import "server-only";
import { after } from "next/server";
import { notify } from "@/lib/email/notify";

// «Conta em análise»: enviado automaticamente quando o registo é gravado. Corre depois da resposta (nunca atrasa
// nem faz falhar o registo); se o envio falhar, fica registado e o cron repete. A chave é a conta (authId): os vários
// caminhos de registo ou um pedido repetido nunca enviam duas vezes.
export function sendPendingReviewEmail(input: { authId: string; email: string; name: string | null; locale: string | null; workspaceId: string }): void {
  const job = () => notify({ kind: "pending_review", dedupeKey: `pending:${input.authId}`, to: input.email, locale: input.locale, workspaceId: input.workspaceId, payload: { name: input.name } });
  try {
    after(job);
  } catch {
    // Fora de um pedido (scripts, testes): corre já, sem bloquear nem lançar.
    void job();
  }
}
