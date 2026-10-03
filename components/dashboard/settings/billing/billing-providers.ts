// Gateways de pagamento da organização. Para acrescentar um (ex.: Proxypay/Multicaixa em Kwanzas) basta
// uma entrada aqui com os seus endpoints: a UI (seletor, botões, erros) não muda.
// Sem `checkoutEndpoint` o gateway aparece como "Em breve" e não pode ser escolhido.

export type BillingProviderId = "stripe" | "multicaixa";

export interface BillingProvider {
  id: BillingProviderId;
  name: string;
  currencies: string[];
  // POST → { url }: o cliente é redirecionado para esse URL.
  checkoutEndpoint: string | null;
  // POST → { url } do portal onde o cliente gere método de pagamento, faturas e cancelamento.
  portalEndpoint: string | null;
}

export const BILLING_PROVIDERS: BillingProvider[] = [
  {
    id: "stripe",
    name: "Cartão (Stripe)",
    currencies: ["EUR", "USD"],
    checkoutEndpoint: "/api/stripe/checkout",
    portalEndpoint: "/api/stripe/portal",
  },
  {
    id: "multicaixa",
    name: "Multicaixa / Proxypay",
    currencies: ["AOA"],
    checkoutEndpoint: null,
    portalEndpoint: null,
  },
];

export const isProviderAvailable = (provider: BillingProvider) => provider.checkoutEndpoint !== null;

// Onde se gere uma subscrição que já existe (hoje só o Stripe tem portal).
export const PORTAL_PROVIDER = BILLING_PROVIDERS.find((p) => p.portalEndpoint) ?? BILLING_PROVIDERS[0];
