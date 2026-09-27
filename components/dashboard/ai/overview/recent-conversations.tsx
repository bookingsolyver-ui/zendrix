"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";

type Conversation = {
  id: string;
  customer: string;
  summary: string;
  resolved: boolean;
  transcript: string[];
};

const CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    customer: "Ana Martins",
    summary: "Perguntou sobre o estado da entrega do pedido #1042.",
    resolved: true,
    transcript: [
      "Cliente: Olá, o meu pedido já foi enviado?",
      "IA: Olá Ana! O seu pedido #1042 foi enviado esta manhã e chega em 2 dias úteis. 📦",
      "Cliente: Perfeito, obrigada!",
    ],
  },
  {
    id: "conv-2",
    customer: "João Costa",
    summary: "Pediu para falar com um atendente sobre uma reclamação.",
    resolved: false,
    transcript: [
      "Cliente: Isto não é o que eu encomendei, quero falar com alguém.",
      "IA: Lamento a situação, João. Vou transferir a conversa para a nossa equipa de atendimento.",
    ],
  },
  {
    id: "conv-3",
    customer: "Marta Silva",
    summary: "Confirmou a compra e recebeu o link de pagamento.",
    resolved: true,
    transcript: [
      "Cliente: Ainda têm o vestido azul em M?",
      "IA: Temos sim! Acabei de reservar o seu e enviei o link de pagamento. 🎉",
      "Cliente: Já paguei, obrigada!",
    ],
  },
];

export function RecentConversations() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
      <h2 className="text-sm font-semibold text-white">Últimas Conversas Geridas</h2>

      <div className="mt-5 space-y-3">
        {CONVERSATIONS.map((conversation) => {
          const isOpen = openId === conversation.id;

          return (
            <div key={conversation.id} className="rounded-xl border border-white/5 bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]/10">
                    <WhatsAppGlyph className="h-4 w-4 text-[#25D366]" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{conversation.customer}</p>
                    <p className="mt-0.5 text-xs text-white/40">{conversation.summary}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : conversation.id)}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-white/15 px-3.5 py-2 text-xs font-semibold text-white/80 transition-colors hover:border-white/30 hover:bg-white/[0.03]"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {isOpen ? "Ocultar transcrito" : "Ler transcrito"}
                </button>
              </div>

              {isOpen && (
                <div className="mt-4 space-y-1.5 border-t border-white/5 pt-4">
                  {conversation.transcript.map((line, index) => (
                    <p key={index} className="text-xs leading-relaxed text-white/60">
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
