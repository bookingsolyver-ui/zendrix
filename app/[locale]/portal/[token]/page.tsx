import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { ApproveButton } from "@/components/portal/approve-button";
import { formatMoney } from "@/lib/cash/dunning";
import { ProposalService } from "@/lib/portal/service";
import { looksLikePortalToken } from "@/lib/portal/token";

// Kwanza Flow Portal: a página que o CLIENTE do nosso cliente abre no telemóvel. Pública (a autenticação é o token do link).
// Sem indexação e sem enviar o endereço (que contém o token) a terceiros.
export const metadata: Metadata = { title: "Proposta", robots: { index: false, follow: false }, referrer: "no-referrer" };

const TEXT = {
  pt: { hello: "Olá", intro: "Preparámos esta proposta para si.", total: "Total", valid: "Válida até", confirm: "Li a proposta e aceito os valores indicados.", approve: "Aprovar orçamento", done: "Orçamento aprovado. Obrigado!", failed: "Não foi possível aprovar. O link pode ter expirado.", approvedAlready: "Esta proposta já foi aprovada. Obrigado!", invalid: "Link inválido ou expirado", invalidBody: "Peça um novo link a quem lhe enviou a proposta.", qty: "Qtd." },
  en: { hello: "Hello", intro: "We prepared this proposal for you.", total: "Total", valid: "Valid until", confirm: "I have read the proposal and accept the amounts shown.", approve: "Approve quote", done: "Quote approved. Thank you!", failed: "We could not approve it. The link may have expired.", approvedAlready: "This proposal was already approved. Thank you!", invalid: "Invalid or expired link", invalidBody: "Ask whoever sent you the proposal for a new link.", qty: "Qty" },
  es: { hello: "Hola", intro: "Hemos preparado esta propuesta para usted.", total: "Total", valid: "Válida hasta", confirm: "He leído la propuesta y acepto los importes indicados.", approve: "Aprobar presupuesto", done: "Presupuesto aprobado. ¡Gracias!", failed: "No se pudo aprobar. El enlace puede haber caducado.", approvedAlready: "Esta propuesta ya fue aprobada. ¡Gracias!", invalid: "Enlace inválido o caducado", invalidBody: "Pida un nuevo enlace a quien le envió la propuesta.", qty: "Cant." },
} as const;

export default async function PortalPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = TEXT[locale === "en" || locale === "es" ? locale : "pt"];
  const view = looksLikePortalToken(token) ? await ProposalService.getForPortal(token) : null;

  if (!view) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-muted" />
        <h1 className="text-xl font-semibold">{t.invalid}</h1>
        <p className="text-sm text-muted">{t.invalidBody}</p>
      </main>
    );
  }

  const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long", year: "numeric" }).format(new Date(view.expiresAt));
  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-8 sm:py-12">
      <p className="text-sm text-muted">{view.business}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{view.title}</h1>
      <p className="mt-2 text-sm text-muted">{view.customer ? `${t.hello} ${view.customer}. ` : ""}{t.intro}</p>

      <div className="glow-border mt-6 rounded-2xl p-5">
        <ul className="divide-y divide-border/60">
          {view.lines.map((line, index) => (
            <li key={index} className="flex items-start justify-between gap-4 py-3 text-sm">
              <span className="min-w-0">{line.description}<span className="block text-xs text-muted">{t.qty} {line.quantity} × {formatMoney(line.unitMinor, view.currency)}</span></span>
              <span className="shrink-0 font-medium">{formatMoney(line.quantity * line.unitMinor, view.currency)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-baseline justify-between border-t border-border pt-4 text-lg font-semibold"><span>{t.total}</span><span>{formatMoney(view.amountMinor, view.currency)}</span></p>
      </div>

      <div className="mt-6">
        {view.approved ? (
          <p className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-5 text-center font-semibold text-emerald-300"><CheckCircle2 className="h-6 w-6" />{t.approvedAlready}</p>
        ) : (
          <>
            <ApproveButton token={token} labels={{ confirm: t.confirm, approve: t.approve, done: t.done, failed: t.failed }} />
            <p className="mt-3 text-center text-xs text-muted">{t.valid} {date}</p>
          </>
        )}
      </div>
    </main>
  );
}
