import "server-only";

// Envio de e-mails transacionais (convites) pela API HTTP do Resend, sem SDK. Opcional: sem RESEND_API_KEY e
// EMAIL_FROM não se envia nada e quem chama usa outra via (o convite mostra o link para copiar).
// EMAIL_FROM tem de ser um remetente de um domínio verificado no Resend, ex.: "Zentrix <no-reply@o-seu-dominio>".

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());

export async function sendEmail(input: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!key || !from) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text, html: input.html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[email] o Resend recusou o envio:", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] falhou o envio:", err instanceof Error ? err.name : "unknown");
    return false;
  }
}

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
