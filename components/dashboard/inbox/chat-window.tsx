"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Bot, Clock, Loader2, Pause, Send } from "lucide-react";
import { contactLabel } from "@/lib/inbox/display";
import { channelOf, CHANNEL_LABEL } from "@/lib/inbox/channels";
import { LEAD_STAGE_LABEL } from "@/lib/leads/lead";
import { ChannelBadge } from "@/components/dashboard/inbox/channel-badge";
import { REPLY_WINDOW_MS, type ChatMessage, type ConversationSummary } from "@/lib/inbox/types";

const POLL_MS = 3000;

const STATUS_LABEL: Record<string, string> = {
  QUEUED: "Na fila",
  SENT: "Enviada",
  DELIVERED: "Entregue",
  READ: "Lida",
  FAILED: "Falhou",
};

// Mensagens que ainda não saíram para a Meta: estão na fila de saída (QUEUED na Inbox; PENDING/PROCESSING são
// os estados da própria fila). Passam sozinhas a "Enviada" (ou "Falhou") quando o worker as envia.
const QUEUE_LABEL: Record<string, string> = {
  QUEUED: "Na fila…",
  PENDING: "Na fila…",
  PROCESSING: "A enviar…",
};

const SEND_ERRORS: Record<string, string> = {
  window_closed:
    "Passaram mais de 24 h desde a última mensagem do cliente. A Meta só permite responder com um template.",
  token_expired: "O token da Meta expirou. Atualize-o em Definições → WhatsApp.",
  rate_limited: "Está a enviar depressa demais. Aguarde um instante.",
  no_integration: "Não há nenhum canal ligado a esta conversa.",
  subscription_required: "O seu plano não está ativo. Ative-o em Configurações → Faturação para voltar a enviar.",
  invalid_input: "A mensagem está vazia ou é demasiado longa.",
};

function time(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatWindow({
  conversation,
  onActivity,
}: {
  conversation: ConversationSummary;
  onActivity: () => void | Promise<void>;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  // Optimistic value while the pause request is in flight; the list poll is the source of truth after.
  const [pendingPause, setPendingPause] = useState<boolean | null>(null);
  const [pauseError, setPauseError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { id, unreadCount } = conversation;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/inbox/conversations/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("load_failed");
      const data = await res.json();
      setMessages(data.messages);
      setNow(Date.now());
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Load now, then keep polling while the tab is visible.
  useEffect(() => {
    const kickoff = setTimeout(load, 0);
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    return () => {
      clearTimeout(kickoff);
      clearInterval(timer);
    };
  }, [load]);

  // Opening a conversation with unread messages marks it as read.
  useEffect(() => {
    if (unreadCount === 0) return;
    fetch(`/api/inbox/conversations/${id}`, { method: "PATCH" })
      .then(() => onActivity())
      .catch(() => {});
  }, [id, unreadCount, onActivity]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const isPaused = pendingPause ?? conversation.isPaused;

  async function togglePause() {
    if (pendingPause !== null) return;
    const next = !isPaused;
    setPendingPause(next);
    setPauseError(false);
    try {
      const res = await fetch(`/api/inbox/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: next }),
      });
      if (!res.ok) throw new Error("pause_failed");
      await onActivity(); // refresh the list so every place shows the new state
    } catch {
      setPauseError(true);
    } finally {
      setPendingPause(null);
    }
  }

  const lastInbound = [...messages].reverse().find((message) => message.direction === "IN");
  const canReply = Boolean(
    lastInbound && now - new Date(lastInbound.createdAt).getTime() <= REPLY_WINDOW_MS
  );

  async function send() {
    const body = text.trim();
    if (!body || isSending || !canReply) return;
    setIsSending(true);
    setSendError(null);

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id, text: body }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setSendError(SEND_ERRORS[data?.error] ?? "Não foi possível enviar a mensagem. Tente novamente.");
        return;
      }

      setMessages((previous) => [...previous, data.message]);
      setText("");
      onActivity();
    } catch {
      setSendError("Não foi possível enviar a mensagem. Tente novamente.");
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    send();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  const platform = channelOf(conversation.platform);
  const title = contactLabel(conversation.contactName, conversation.waId, platform);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background/40">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <ChannelBadge platform={platform} />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted">
              {platform === "WHATSAPP" ? `+${conversation.waId}` : CHANNEL_LABEL[platform]}
              {conversation.email ? ` · ${conversation.email}` : ""}
            </p>
            {/* O que a IA apurou do cliente: estado do lead e a necessidade principal. */}
            <p className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] text-muted">
              <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-white/70">{LEAD_STAGE_LABEL[conversation.leadStage]}</span>
              {conversation.painPoint && <span className="truncate" title={conversation.painPoint}>{conversation.painPoint}</span>}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {pauseError && <span className="text-xs text-danger">Não foi possível alterar.</span>}
          <button
            type="button"
            onClick={togglePause}
            disabled={pendingPause !== null}
            aria-pressed={isPaused}
            title={
              isPaused
                ? "A IA está pausada: só a equipa responde a este cliente."
                : "Assumir a conversa: a IA deixa de responder a este cliente."
            }
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
              isPaused
                ? "border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400/15"
                : "border-border text-foreground hover:bg-surface-2"
            }`}
          >
            {pendingPause !== null ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isPaused ? (
              <Bot className="h-3.5 w-3.5" />
            ) : (
              <Pause className="h-3.5 w-3.5" />
            )}
            {isPaused ? "Retomar IA" : "Pausar IA"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-5 py-4">
        {isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        )}
        {!isLoading && loadError && (
          <p className="text-center text-sm text-danger">Não foi possível carregar as mensagens.</p>
        )}

        {messages.map((message) => {
          const isOut = message.direction === "OUT";
          return (
            <div
              key={message.id}
              className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                isOut
                  ? "self-end rounded-br-sm bg-emerald-600 text-white"
                  : "self-start rounded-bl-sm bg-surface-2 text-foreground"
              }`}
            >
              {message.mediaUrl && (
                // preload="none": não descarrega nada até alguém carregar em play. O URL é estável entre
                // atualizações da lista, por isso a reprodução não reinicia.
                <audio
                  controls
                  preload="none"
                  src={message.mediaUrl}
                  aria-label="Nota de voz do cliente"
                  className="mb-1.5 h-9 w-full min-w-[220px] max-w-[280px]"
                />
              )}
              {message.type === "audio" && (
                <p className={`mb-0.5 text-[10px] uppercase tracking-wide ${isOut ? "text-white/60" : "text-muted"}`}>
                  {isOut ? "Voz enviada" : "Transcrição"}
                </p>
              )}
              <p
                className={`whitespace-pre-wrap break-words ${
                  message.type !== "text" && message.type !== "audio" ? "italic opacity-80" : ""
                }`}
              >
                {message.body}
              </p>
              <p className={`mt-1 text-right text-[10px] ${isOut ? "text-white/70" : "text-muted"}`}>
                {time(message.createdAt)}
                {isOut && QUEUE_LABEL[message.status] && (
                  <span
                    className="ml-1 inline-flex animate-pulse items-center gap-1 align-middle"
                    title="A aguardar envio para a Meta"
                  >
                    · <Clock className="h-2.5 w-2.5" aria-hidden />
                    {QUEUE_LABEL[message.status]}
                  </span>
                )}
                {isOut && !QUEUE_LABEL[message.status] && ` · ${STATUS_LABEL[message.status] ?? message.status}`}
                {isOut && message.status === "FAILED" && message.errorMessage
                  ? ` (${message.errorMessage})`
                  : ""}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border p-3">
        {isPaused && (
          <p className="mb-2 text-xs text-amber-300">
            IA pausada nesta conversa: só a equipa responde. As mensagens do cliente continuam a ser guardadas.
          </p>
        )}
        {!isLoading && !canReply && (
          <p className="mb-2 text-xs text-muted">
            {SEND_ERRORS.window_closed}
          </p>
        )}
        {sendError && (
          <p role="alert" className="mb-2 text-xs text-danger">
            {sendError}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!canReply || isSending}
            rows={1}
            maxLength={4096}
            placeholder={canReply ? "Escreva uma mensagem…" : "Resposta indisponível"}
            aria-label="Mensagem"
            className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-neon-green disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!canReply || isSending || !text.trim()}
            aria-label="Enviar"
            className="neon-green-btn flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-green-500 text-background hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
