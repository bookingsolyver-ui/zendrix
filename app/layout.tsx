import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Zentrix — Atendimento omnicanal com IA",
  description:
    "Responda a WhatsApp, Instagram e Messenger numa só caixa de entrada. Um assistente de IA treinado com os dados do seu negócio atende os clientes e a sua equipa assume quando quiser. 14 dias grátis, sem cartão.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
