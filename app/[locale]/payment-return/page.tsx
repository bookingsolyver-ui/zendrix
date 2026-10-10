import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { CheckCircle2, XCircle } from "lucide-react";
import { legalLang } from "@/lib/legal/content";

// Para onde o Stripe devolve quem acabou de pagar (ou desistiu). Genérica e pública: não mostra dados de ninguém.
export const metadata: Metadata = { title: "Payment · Kwanza Flow", robots: { index: false } };

const TEXT = {
  pt: {
    success: ["Pagamento concluído", "Obrigado! Recebemos o seu pagamento. Pode voltar à conversa: a equipa dá seguimento ao seu pedido."],
    canceled: ["Pagamento cancelado", "Não foi cobrado nada. Pode voltar à conversa e pedir um novo link se quiser pagar."],
  },
  en: {
    success: ["Payment completed", "Thank you! We received your payment. You can go back to the conversation: the team will follow up on your order."],
    canceled: ["Payment canceled", "You were not charged. You can go back to the conversation and ask for a new link if you want to pay."],
  },
} as const;

export default async function PaymentReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { status } = await searchParams;
  const ok = status === "success";
  const [title, body] = TEXT[legalLang(locale)][ok ? "success" : "canceled"];
  const Icon = ok ? CheckCircle2 : XCircle;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Icon className={`h-12 w-12 ${ok ? "text-emerald-400" : "text-white/40"}`} />
      <h1 className="mt-5 text-2xl font-semibold text-white">{title}</h1>
      <p className="mt-3 max-w-md text-white/60">{body}</p>
    </main>
  );
}
