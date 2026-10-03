"use client";

import type { ConversationSummary } from "@/lib/inbox/types";
import { contactLabel, visibleName } from "@/lib/inbox/display";
import { channelOf } from "@/lib/inbox/channels";
import { ChannelBadge } from "@/components/dashboard/inbox/channel-badge";

function displayName(conversation: ConversationSummary) {
  return contactLabel(conversation.contactName, conversation.waId, channelOf(conversation.platform));
}

function initials(conversation: ConversationSummary) {
  const name = visibleName(conversation.contactName);
  if (!name) return "#";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

// Today: the time. Earlier: the date.
function shortTime(iso: string) {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  emptyText,
}: {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyText: string;
}) {
  if (conversations.length === 0) {
    return <p className="p-6 text-center text-sm text-muted">{emptyText}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {conversations.map((conversation) => {
        const isSelected = conversation.id === selectedId;
        return (
          <li key={conversation.id}>
            <button
              type="button"
              onClick={() => onSelect(conversation.id)}
              aria-current={isSelected ? "true" : undefined}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                isSelected ? "bg-surface-2" : "hover:bg-surface-2/60"
              }`}
            >
              <span className="relative shrink-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-foreground ring-1 ring-border">
                  {initials(conversation)}
                </span>
                {/* O canal da conversa, no canto do avatar. */}
                <ChannelBadge
                  platform={channelOf(conversation.platform)}
                  size="sm"
                  className="absolute -bottom-0.5 -right-0.5 ring-2 ring-background"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-foreground">
                      {displayName(conversation)}
                    </span>
                    {conversation.isPaused && (
                      <span className="shrink-0 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                        Humano
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted">
                    {shortTime(conversation.lastMessageAt)}
                  </span>
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted">
                    {conversation.lastMessagePreview ?? ""}
                  </span>
                  {conversation.unreadCount > 0 && (
                    <span className="shrink-0 rounded-full bg-neon-green px-1.5 py-0.5 text-[10px] font-semibold text-background">
                      {conversation.unreadCount}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
