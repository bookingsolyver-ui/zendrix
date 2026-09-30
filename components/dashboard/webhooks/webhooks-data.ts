export type WebhookEndpoint = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
};

export const WEBHOOK_ENDPOINTS: WebhookEndpoint[] = [];
