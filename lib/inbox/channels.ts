// Puro (sem servidor): metadados dos canais da Inbox, partilhados pela lista e pelo chat.
import type { ConversationSummary } from "@/lib/inbox/types";

export type ChannelPlatform = ConversationSummary["platform"];

export const CHANNEL_LABEL: Record<ChannelPlatform, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  MESSENGER: "Messenger",
};

// Tolerante: uma resposta antiga da API (sem `platform`) é tratada como WhatsApp.
export const channelOf = (platform: string | null | undefined): ChannelPlatform =>
  platform === "INSTAGRAM" || platform === "MESSENGER" ? platform : "WHATSAPP";
