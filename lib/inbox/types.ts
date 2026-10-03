// Shapes shared by the inbox API routes and the inbox UI.

export interface ConversationSummary {
  id: string;
  contactName: string | null;
  waId: string;
  // Canal da conversa: WHATSAPP | INSTAGRAM | MESSENGER.
  platform: "WHATSAPP" | "INSTAGRAM" | "MESSENGER";
  lastMessagePreview: string | null;
  lastMessageAt: string;
  unreadCount: number;
  isPaused: boolean;
}

export interface ChatMessage {
  id: string;
  direction: "IN" | "OUT";
  type: string;
  body: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  // Short-lived signed URL of the original audio (customer voice notes), or null.
  mediaUrl: string | null;
}

// Meta only allows free-text replies within 24h of the customer's last message.
export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;
