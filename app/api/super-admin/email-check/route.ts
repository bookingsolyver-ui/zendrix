import { z } from "zod";
import { appDomain, domainMismatch, parseFrom } from "@/lib/email/from";
import { sendEmail } from "@/lib/email/send";
import { fail, ok } from "@/lib/http/route";
import { superAdminGuarded } from "@/lib/superadmin/guard";

// Diagnóstico do e-mail EM PRODUÇÃO (só o super-admin): valida o remetente, vê se o domínio está verificado no Resend
// e envia um e-mail de teste a quem pedir, devolvendo o erro real do Resend. Nunca devolve a chave nem o e-mail.
//   fetch("/api/super-admin/email-check", { method: "POST", body: JSON.stringify({ to: "eu@exemplo.com" }) })
export async function POST(request: Request) {
  return superAdminGuarded(request, "email-check", async () => {
    const body = z.object({ to: z.string().email().max(254) }).safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("invalid_input", 400);

    const key = process.env.RESEND_API_KEY?.trim();
    const from = parseFrom(process.env.EMAIL_FROM);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const report: Record<string, unknown> = {
      resendKeyPresent: Boolean(key),
      appUrl: appUrl ?? null,
      from: from.ok ? { address: from.address, domain: from.domain, name: from.name } : { invalid: from.reason },
      domainMatchesApp: from.ok ? !domainMismatch(from.domain, appUrl) : null,
      appDomain: appDomain(appUrl),
      supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    };

    // O estado do domínio no Resend (exige uma chave com acesso total; uma chave só de envio responde 401).
    if (key && from.ok) {
      try {
        const res = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) });
        const json = (await res.json().catch(() => null)) as { data?: { name: string; status: string }[] } | null;
        if (res.ok) {
          const found = json?.data?.find((d) => d.name === from.domain);
          report.resendDomain = found ? { name: found.name, status: found.status } : { name: from.domain, status: "não existe na conta Resend" };
        } else {
          report.resendDomain = { note: `não foi possível listar (HTTP ${res.status}); uma chave só de envio não vê os domínios` };
        }
      } catch {
        report.resendDomain = { note: "sem resposta do Resend" };
      }
    }

    const sent = await sendEmail({
      to: body.data.to,
      subject: "Teste de e-mail da Kwanza Flow",
      text: "Se está a ler isto, o envio de e-mails da Kwanza Flow pelo Resend está a funcionar em produção.",
      html: "<p>Se está a ler isto, o envio de e-mails da <strong>Kwanza Flow</strong> pelo Resend está a funcionar em produção.</p>",
    });
    report.testSend = sent.ok ? { ok: true } : { ok: false, error: sent.error, status: sent.status ?? null, detail: sent.detail ?? null };
    return ok(report);
  });
}
