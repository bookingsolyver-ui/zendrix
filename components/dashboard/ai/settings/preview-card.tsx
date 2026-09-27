"use client";

import { useState } from "react";
import { Send, Smartphone } from "lucide-react";
import { GlassCard } from "@/components/dashboard/ai/settings/glass-card";

type ChatMessage = {
  from: "user" | "bot";
  text: string;
};

export function PreviewCard({ assistantName }: { assistantName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setInput("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: `Olá! Sou ${assistantName || "o assistente"} 👋 Diz-me como posso ajudar e sigo as regras que configuraste.`,
        },
      ]);
    }, 500);
  }

  return (
    <GlassCard icon={Smartphone} title="Preview em Tempo Real">
      <div className="mx-auto w-[230px]">
        <div className="rounded-[2rem] border-[6px] border-neutral-800 bg-neutral-900 p-1.5 shadow-xl shadow-black/50">
          <div className="flex h-[380px] flex-col overflow-hidden rounded-[1.4rem] bg-[#0b141a]">
            <div className="border-b border-white/5 bg-[#1f2c34] px-3 py-2.5 text-center">
              <p className="truncate text-[11px] font-semibold text-white">
                {assistantName || "O seu assistente"}
              </p>
              <p className="text-[9px] text-emerald-400">online</p>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto px-2.5 py-3">
              {messages.length === 0 ? (
                <p className="mt-16 px-2 text-center text-xs text-white/30">
                  Teste a sua IA aqui...
                </p>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] leading-snug ${
                      message.from === "user"
                        ? "ml-auto rounded-tr-sm bg-[#005c4b] text-white"
                        : "rounded-tl-sm bg-[#1f2c34] text-white/90"
                    }`}
                  >
                    {message.text}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-1.5 border-t border-white/5 p-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && sendMessage()}
                placeholder="Escreva uma mensagem..."
                className="flex-1 rounded-full bg-white/5 px-2.5 py-1.5 text-[11px] text-white outline-none placeholder:text-white/30"
              />
              <button
                type="button"
                onClick={sendMessage}
                aria-label="Enviar"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-background"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
