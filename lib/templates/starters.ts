// Textos de partida para os modelos de mensagem. Puro (sem servidor): dados simples, seguros de passar a Client Components.
export interface TemplateStarter {
  name: string;
  title: string;
  description: string;
  category: "UTILITY" | "MARKETING";
  body: string;
}

export const TEMPLATE_STARTERS: TemplateStarter[] = [
  { name: "boas_vindas", title: "Boas-vindas", description: "Primeira resposta a quem escreve pela primeira vez.", category: "UTILITY", body: "Olá {{1}}, obrigado por contactar {{2}}. Como podemos ajudar?" },
  { name: "confirmacao_pedido", title: "Confirmação de pedido", description: "Confirma o pedido e indica o valor.", category: "UTILITY", body: "O seu pedido {{1}} foi recebido. Total: {{2}}. Obrigado pela sua compra!" },
  { name: "lembrete_marcacao", title: "Lembrete de marcação", description: "Lembra a data e a hora de uma marcação.", category: "UTILITY", body: "Olá {{1}}, lembramos a sua marcação a {{2}} às {{3}}." },
  { name: "oferta_com_codigo", title: "Oferta com código", description: "Campanha promocional com código de desconto.", category: "MARKETING", body: "{{1}}, use o código {{2}} e tenha desconto na sua próxima compra." },
  { name: "reativacao_cliente", title: "Reativação de cliente", description: "Reaproxima clientes que não compram há algum tempo.", category: "MARKETING", body: "Olá {{1}}, sentimos a sua falta. Temos novidades para si!" },
];
