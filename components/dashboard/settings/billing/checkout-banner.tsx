"use client";

import { useEffect } from "react";
import { CheckCircle2, Info } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

const MAX_REFRESHES = 10;
const REFRESH_MS = 3000;

// Aviso ao voltar do Stripe (?checkout=success|canceled). O estado da subscrição chega por webhook,
// uns segundos DEPOIS do regresso: enquanto a subscrição não aparece, a página recarrega-se sozinha.
export function CheckoutBanner({
  result,
  subscriptionLinked,
}: {
  result: "success" | "canceled";
  subscriptionLinked: boolean;
}) {
  const router = useRouter();
  const waiting = result === "success" && !subscriptionLinked;

  useEffect(() => {
    if (!waiting) return;
    let count = 0;
    const timer = setInterval(() => {
      router.refresh();
      if (++count >= MAX_REFRESHES) clearInterval(timer);
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [waiting, router]);

  if (result === "canceled") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/50" />
        Pagamento cancelado. Não foi cobrado nada e o seu plano continua igual.
      </div>
    );
  }
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      {waiting
        ? "Pagamento recebido. A confirmar a subscrição… isto demora alguns segundos."
        : "Subscrição ativada. O agente de IA está disponível."}
    </div>
  );
}
