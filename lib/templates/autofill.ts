import { visibleName } from "../inbox/display.ts";

// Preenchimento automático das variáveis ({{1}}, {{2}}…) de um modelo com os dados do contacto. Puro (sem servidor):
// testável e usado no ecrã de envio. O sentido de cada variável deduz-se do texto à volta dela («Olá {{1}}» é o nome,
// «e-mail: {{2}}» é o e-mail). Sem pista, só a PRIMEIRA variável leva o primeiro nome (a convenção dos modelos).
// O que não se sabe fica vazio, para o operador escrever. Nunca inventa dados.

export interface ContactFacts {
  name: string | null;
  waId: string;
  email: string | null;
  painPoint: string | null;
}

const firstNameOf = (name: string | null): string => {
  const visible = visibleName(name);
  const first = visible?.split(/\s+/)[0] ?? "";
  return /\p{L}/u.test(first) ? first.slice(0, 40) : "";
};
const fullNameOf = (name: string | null): string => {
  const visible = visibleName(name);
  return visible && /\p{L}/u.test(visible) ? visible.replace(/\s+/g, " ").slice(0, 80) : "";
};

// O que vem logo antes da variável (sem pontuação final, em minúsculas): decide o campo.
const AFTER = String.raw`[\s:*_"'«»(\-–—]*$`;
const HINTS: { re: RegExp; field: "email" | "phone" | "full" | "first" | "need" }[] = [
  { re: new RegExp(String.raw`e-?mail${AFTER}`), field: "email" },
  { re: new RegExp(String.raw`(?:telem[oó]vel|telefone|n[uú]mero|whatsapp|phone|contacto|contato)${AFTER}`), field: "phone" },
  { re: new RegExp(String.raw`(?:nome\s+completo|nome|full\s+name|name|nombre)${AFTER}`), field: "full" },
  { re: new RegExp(String.raw`(?:ol[aá]|oi|ei|caro|cara|caro\(a\)|prezad[oa]s?|exmo\.?|exma\.?|sr\.?|sra\.?|dr\.?|dra\.?|hello|hi|hey|dear|hola|estimad[oa]|bom\s+dia|boa\s+tarde|boa\s+noite)${AFTER}`), field: "first" },
  { re: new RegExp(String.raw`(?:necessidade|interesse|assunto|pedido|sobre)${AFTER}`), field: "need" },
];

export function suggestValues(body: string, variables: string[], contact: ContactFacts): string[] {
  return variables.map((variable, position) => {
    const at = body.indexOf(`{{${variable}}}`);
    const before = at === -1 ? "" : body.slice(Math.max(0, at - 40), at).toLowerCase();
    const hint = HINTS.find((h) => h.re.test(before))?.field ?? (position === 0 ? "first" : null);
    switch (hint) {
      case "email":
        return contact.email?.trim() ?? "";
      case "phone":
        return contact.waId ? `+${contact.waId.replace(/\D/g, "")}` : "";
      case "full":
        return fullNameOf(contact.name);
      case "first":
        return firstNameOf(contact.name);
      case "need": {
        const need = contact.painPoint?.trim() ?? "";
        return need.length > 0 && need.length <= 100 ? need : "";
      }
      default:
        return "";
    }
  });
}
