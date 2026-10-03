"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";

// Mensagens para os códigos de erro das rotas /api/stripe/* (e de futuros gateways, que seguem o mesmo contrato).
const MESSAGES: Record<string, string> = {
  billing_not_configured: "A faturação ainda não está configurada. Contacte o suporte.",
  already_subscribed: "Já tem uma subscrição ativa. Use «Gerir subscrição».",
  no_customer: "Ainda não tem conta de faturação. Subscreva primeiro.",
  forbidden: "Apenas o proprietário ou um gestor pode gerir a faturação.",
  unauthenticated: "A sessão expirou. Volte a iniciar sessão.",
  forbidden_origin: "Pedido recusado. Recarregue a página e tente de novo.",
  rate_limited: "Demasiadas tentativas. Aguarde alguns minutos.",
  billing_failed: "Não foi possível contactar o serviço de pagamentos. Tente novamente.",
};
const GENERIC = "Algo correu mal. Tente novamente.";
const NETWORK = "Sem ligação ao servidor. Verifique a internet e tente novamente.";

// Faz o POST ao endpoint e redireciona para o `url` devolvido (Checkout ou portal).
// `pending` guarda qual ação está em curso; `error` a mensagem a mostrar.
export function useBillingRedirect() {
  const locale = useLocale();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Voltar atrás (botão do browser) restaura a página do histórico com o botão ainda "a carregar".
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(null);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const go = useCallback(
    (endpoint: string, action: string) => {
      setError(null);
      setPending(action);
      fetch(endpoint, {
        method: "POST",
        // A língua atual, para o Stripe devolver o utilizador à mesma língua (a rota valida-a).
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.url) {
            window.location.href = data.url; // a navegação segue: o botão fica a carregar até sair da página
          } else {
            console.error("Erro na resposta:", data);
            setError(MESSAGES[data?.error] ?? GENERIC);
            setPending(null);
          }
        })
        .catch((err) => {
          console.error("Erro de rede:", err);
          setError(NETWORK);
          setPending(null);
        });
    },
    [locale],
  );

  return { go, pending, error };
}
