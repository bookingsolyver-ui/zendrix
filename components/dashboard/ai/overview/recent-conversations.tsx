"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";

export type RecentConversation = {
  id: string;
  customer: string;
  summary: string;
  transcript: string[];
};

export function RecentConversations({ conversations }: { conversations: RecentConversation[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
      <h2 className="text-sm font-semibold text-white">Últimas Conversas Geridas</h2>

      {conversations.length === 0 && (
        <p className="mt-5 rounded-xl border border-white/5 bg-black/20 px-4 py-8 text-center text-sm text-white/40">
          Ainda não há conversas. Quando um cliente escrever para o seu WhatsApp, aparece aqui.
        </p>
      )}

      <div className="mt-5 space-y-3">
        {conversations.map((conversation) => {
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
