// Quais módulos do produto estão prontos para clientes. Puro (sem servidor).
//
// O painel só mostra o que funciona de ponta a ponta. Os módulos que ainda são maquetas (CRM, marketing,
// e-commerce, análises...) ficam ESCONDIDOS: fora do menu e com as rotas a devolver 404. O código mantém-se (é
// trabalho feito); para o mostrar em desenvolvimento defina NEXT_PUBLIC_SHOW_UNFINISHED=true.
//
// Para lançar um módulo: ponha-o a `true` aqui. Nada mais muda (menu e rota seguem esta lista).

export const FEATURES = {
  // Operacionais
  contacts: true,
  aiOverview: true,
  // Operacionais: dados reais na base de dados
  crm: true,
  marketing: true,
  templates: true,
  campaigns: true,
  marketingAutomations: true,
  popups: true,
  // Em construção (sem motor de envio ou de execução): escondidos
  ecommerce: false,
  analytics: false,
  segments: true,
  aiPersona: false,
  automationsBuilder: false,
  integrations: false,
  webhooks: false,
} as const;

export type FeatureId = keyof typeof FEATURES;

// Lido no build (NEXT_PUBLIC_): em produção fica sempre desligado.
const showUnfinished = process.env.NEXT_PUBLIC_SHOW_UNFINISHED === "true" && process.env.NODE_ENV !== "production";

export const isFeatureEnabled = (feature: FeatureId): boolean => showUnfinished || FEATURES[feature];
