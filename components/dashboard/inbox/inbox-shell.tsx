"use client";

import { useCallback, useEffect, useState } from "react";
import { Headset, Inbox as InboxIcon, Plus, Tag, User, UserX, Workflow } from "lucide-react";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";
import { Link, useRouter } from "@/i18n/navigation";
import { SoonButton } from "@/components/ui/soon-button";
import { ConversationList } from "@/components/dashboard/inbox/conversation-list";
import { ChatWindow } from "@/components/dashboard/inbox/chat-window";
import type { ConversationSummary } from "@/lib/inbox/types";
import type { WhatsAppStatus } from "@/lib/whatsapp/status";

const LIST_POLL_MS = 5000;

const FILTERS = [
  { key: "all", label: "Todas", icon: InboxIcon },
  { key: "mine", label: "Minhas", icon: User },
  { key: "unassigned", label: "Sem responsável", icon: UserX },
  { key: "human", label: "Atendimento Humano", icon: Headset },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export function InboxShell({ whatsapp }: { whatsapp: WhatsAppStatus }) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isListLoading, setIsListLoading] = useState(whatsapp.connected);
  const [listError, setListError] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox/conversations", { cache: "no-store" });
      if (!res.ok) throw new Error("list_failed");
      const data = await res.json();
      setConversations(data.conversations);
      setListError(false);
    } catch {
      setListError(true);
    } finally {
      setIsListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!whatsapp.connected) return;
    const kickoff = setTimeout(loadConversations, 0);
    const timer = setInterval(() => {
      if (!document.hidden) loadConversations();
    }, LIST_POLL_MS);
    return () => {
      clearTimeout(kickoff);
      clearInterval(timer);
    };
  }, [whatsapp.connected, loadConversations]);

  // "Atendimento Humano" = conversations where a human paused the AI. There is still no
  // assignment model, so every conversation is unassigned and none is "mine".
  const humanConversations = conversations.filter((conversation) => conversation.isPaused);
  const counts: Record<FilterKey, number> = {
    all: conversations.length,
    unassigned: conversations.length,
    mine: 0,
    human: humanConversations.length,
  };
  const visibleConversations =
    activeFilter === "all" || activeFilter === "unassigned"
      ? conversations
      : activeFilter === "human"
        ? humanConversations
        : [];
  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border md:flex-row">
      <aside className="flex w-full shrink-0 flex-col overflow-y-auto border-b border-border bg-surface/60 p-4 md:h-full md:w-60 md:border-b-0 md:border-r">
        <nav className="space-y-1">
          {FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.key;

            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-surface-2 text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-neon-green" : ""}`} />
                <span className="flex-1 text-left">{filter.label}</span>
                <span className="rounded-full bg-background px-1.5 py-0.5 text-xs text-muted">
                  {counts[filter.key]}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-border pt-5">
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <Workflow className="h-3.5 w-3.5" />
              Automações
            </span>
            <Link
              href="/dashboard/marketing/automations"
              aria-label="Nova automação"
              className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="mt-2 px-1 text-xs text-muted">Nenhuma automação configurada.</p>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <Tag className="h-3.5 w-3.5" />
              Tags
            </span>
            <SoonButton
              feature="Nova tag"
              aria-label="Nova tag"
              className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </SoonButton>
          </div>
          <p className="mt-2 px-1 text-xs text-muted">Nenhuma tag criada.</p>
        </div>
      </aside>

      {whatsapp.connected ? (
        <>
          <section
            aria-label="Conversas"
            className="flex max-h-64 w-full shrink-0 flex-col overflow-y-auto border-b border-border md:h-full md:max-h-none md:w-80 md:border-b-0 md:border-r"
          >
            {isListLoading ? (
              <p className="p-6 text-center text-sm text-muted">A carregar conversas…</p>
            ) : listError && conversations.length === 0 ? (
              <p className="p-6 text-center text-sm text-danger">
                Não foi possível carregar as conversas.
              </p>
            ) : (
              <ConversationList
                conversations={visibleConversations}
                selectedId={selectedId}
                onSelect={setSelectedId}
                emptyText={
                  conversations.length === 0
                    ? "Ainda sem conversas. Quando um cliente enviar uma mensagem para o seu número, aparece aqui."
                    : "Nenhuma conversa neste filtro."
                }
              />
            )}
          </section>

          {selected ? (
            <ChatWindow key={selected.id} conversation={selected} onActivity={loadConversations} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background/40 p-10 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366]/10 ring-1 ring-[#25D366]/30">
                <WhatsAppGlyph className="h-8 w-8 text-[#25D366]" />
              </span>
              <div className="max-w-xs">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  WhatsApp Conectado
                </span>
                <p className="mt-3 text-sm text-muted">
                  {conversations.length === 0
                    ? "Aguardando a primeira mensagem de um cliente."
                    : "Escolha uma conversa à esquerda para ver as mensagens."}
                </p>
              </div>
              <Link
                href="/dashboard/settings/whatsapp"
                className="glow-border flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary"
              >
                Gerir ligação
              </Link>
            </div>
          )}
        </>
      ) : (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-background/40 p-10 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#25D366]/10 ring-1 ring-[#25D366]/30">
          <WhatsAppGlyph className="h-10 w-10 text-[#25D366]" />
        </span>

        <div className="max-w-sm">
          <h2 className="text-xl font-semibold tracking-tight">
            Comece conectando o seu WhatsApp
          </h2>
          <p className="mt-2 text-sm text-muted">
            Ligue o seu número de WhatsApp Business e comece a responder aos seus clientes
            diretamente a partir do Inbox da Zentrix.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard/settings/whatsapp")}
          className="neon-green-btn flex items-center gap-2 rounded-full bg-green-500 px-6 py-3 text-sm font-semibold text-background hover:bg-green-400"
        >
          <WhatsAppGlyph className="h-4 w-4" />
          Conectar WhatsApp
        </button>
      </div>
      )}
    </div>
  );
}
