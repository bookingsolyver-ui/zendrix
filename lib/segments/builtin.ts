// As listas predefinidas de contactos: também são regras, por isso contam-se e usam-se (nas campanhas) como as
// dos utilizadores. Puro (sem servidor).
import { parseRules, type SegmentRules } from "@/lib/segments/rules";

export interface BuiltInSegment {
  key: string;
  name: string;
  description: string;
  type: "Lista" | "Dinâmico";
  rules: SegmentRules;
}

const def = (key: string, name: string, description: string, rules: Partial<SegmentRules>, type: BuiltInSegment["type"] = "Dinâmico"): BuiltInSegment => ({
  key,
  name,
  description,
  type,
  rules: parseRules(rules),
});

export const BUILT_IN_SEGMENTS: BuiltInSegment[] = [
  def("all", "Todos os contactos", "A lista padrão, com todas as pessoas que já falaram consigo.", {}, "Lista"),
  def("new7", "Novos (últimos 7 dias)", "Contactos criados nos últimos 7 dias.", { createdWithinDays: 7 }),
  def("engaged", "Em conversa", "Responderam e estão a ser acompanhados.", { stages: ["ENGAGED"] }),
  def("qualified", "Qualificados", "Têm interesse real e dados de contacto confirmados.", { stages: ["QUALIFIED"] }),
  def("payment", "Pagamento enviado", "Receberam um link de pagamento que ainda não foi pago.", { stages: ["PAYMENT_SENT"] }),
  def("won", "Clientes", "Pagamento confirmado.", { stages: ["WON"] }),
  def("optout", "Sem mensagens automáticas", "Pediram para não receber mais mensagens automáticas.", { optedOut: "yes" }),
];

export const findBuiltIn = (key: string) => BUILT_IN_SEGMENTS.find((segment) => segment.key === key) ?? null;
