// Funcionalidades que a equipa pode ligar/desligar por organização. Puro (sem servidor): testável.
export const TAP = "*"; // a «torneira»: desliga tudo o que é premium

export const FEATURE_FLAGS = [
  { id: "whatsapp_integration", label: "Integração WhatsApp / Meta" },
  { id: "ai_agent", label: "Agente de IA" },
  { id: "ai_predictions", label: "Previsões (Predictive CFO)" },
  { id: "nightwatch", label: "Nightwatch (triagem noturna)" },
  { id: "cash_collector", label: "Cash-Collector (cobranças)" },
  { id: "portal", label: "Kwanza Flow Portal (propostas)" },
  { id: "data_cleaner", label: "Data-Cleaner (duplicados)" },
  { id: "magic_importer", label: "Magic Importer" },
] as const;
export type FeatureFlagId = (typeof FEATURE_FLAGS)[number]["id"];

export const isKnownFlag = (flag: string): flag is FeatureFlagId | typeof TAP => flag === TAP || FEATURE_FLAGS.some((f) => f.id === flag);

export interface FlagRow {
  flag: string;
  enabled: boolean;
}

// Sem linha = ligado. Uma funcionalidade está desligada se ELA ou a torneira (*) estiverem desligadas. A torneira
// desligada manda: nem uma linha «ligada» da funcionalidade a contraria (cortar a torneira tem de cortar mesmo).
export function resolveFlag(rows: FlagRow[], flag: string): boolean {
  if (rows.some((r) => r.flag === TAP && !r.enabled)) return false;
  const own = rows.find((r) => r.flag === flag);
  return own ? own.enabled : true;
}
