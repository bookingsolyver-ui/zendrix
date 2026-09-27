export type WebhookEndpoint = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
};

export const WEBHOOK_ENDPOINTS: WebhookEndpoint[] = [
  {
    id: "wh-1",
    url: "https://api.zentrix.com/hooks/8f3a2b91...",
    events: ["order.paid", "order.refunded"],
    active: true,
  },
  {
    id: "wh-2",
    url: "https://minhaloja.com/webhooks/zentrix...",
    events: ["cart.abandoned", "contact.created"],
    active: true,
  },
];
