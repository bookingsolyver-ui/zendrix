// A ficha do negócio de uma organização: os campos que o cliente preenche e o texto que o agente lê.
//
// Módulo PURO (sem base de dados nem servidor): é usado pela API para validar e compilar, e pelo ecrã de
// definições para mostrar, em direto, exatamente o que o agente vai ler.

export interface BusinessProduct {
  name: string;
  price: string;
  description: string;
}

export interface BusinessProfile {
  businessName: string;
  description: string;
  products: BusinessProduct[];
  hours: string; // horários e contactos
  rules: string; // regras de atendimento
}

export const LIMITS = {
  businessName: 120,
  description: 3000,
  hours: 1500,
  rules: 3000,
  products: 50,
  productName: 120,
  productPrice: 80,
  productDescription: 500,
  compiled: 12000, // o texto compilado entra em cada pedido ao modelo: tem de ter um teto (custo e contexto)
} as const;

export const emptyProfile = (): BusinessProfile => ({
  businessName: "",
  description: "",
  products: [],
  hours: "",
  rules: "",
});

// A ficha mínima para o agente poder responder: quem é a empresa e o que faz.
export const hasMinimumProfile = (profile: BusinessProfile) =>
  profile.businessName.trim().length > 0 &&
  profile.description.trim().length > 0;

// Texto vindo de um formulário: só quebras de linha simples, sem caracteres de controlo, sem "paredes" de
// linhas em branco.
function clean(value: unknown) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type ProfileErrors = Record<string, string>;
export type ParseResult =
  { ok: true; profile: BusinessProfile } | { ok: false; errors: ProfileErrors };

// Valida e normaliza o que chega da rede (nunca se confia no formato). Erros por campo, para o ecrã os mostrar.
export function parseProfile(input: unknown): ParseResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: { _: "Dados inválidos." } };
  }
  const raw = input as Record<string, unknown>;
  const errors: ProfileErrors = {};

  const text = (
    key: "businessName" | "description" | "hours" | "rules",
    label: string,
  ) => {
    if (raw[key] !== undefined && typeof raw[key] !== "string")
      errors[key] = `${label}: valor inválido.`;
    const value = clean(raw[key]);
    if (value.length > LIMITS[key])
      errors[key] = `${label}: no máximo ${LIMITS[key]} caracteres.`;
    return value;
  };
  const businessName = text("businessName", "Nome comercial");
  const description = text("description", "Descrição");
  const hours = text("hours", "Horários e contactos");
  const rules = text("rules", "Regras de atendimento");

  const products: BusinessProduct[] = [];
  if (raw.products !== undefined && !Array.isArray(raw.products)) {
    errors.products = "Produtos e serviços: formato inválido.";
  } else if (Array.isArray(raw.products)) {
    if (raw.products.length > LIMITS.products) {
      errors.products = `Produtos e serviços: no máximo ${LIMITS.products}.`;
    }
    raw.products.slice(0, LIMITS.products).forEach((item, index) => {
      if (typeof item !== "object" || item === null) {
        errors[`products.${index}`] = "Produto inválido.";
        return;
      }
      const p = item as Record<string, unknown>;
      const product = {
        name: clean(p.name),
        price: clean(p.price),
        description: clean(p.description),
      };
      if (!product.name && !product.price && !product.description) return; // linha vazia: ignora
      if (!product.name)
        errors[`products.${index}.name`] = "Dê um nome ao produto ou serviço.";
      if (product.name.length > LIMITS.productName)
        errors[`products.${index}.name`] =
          `Nome: no máximo ${LIMITS.productName} caracteres.`;
      if (product.price.length > LIMITS.productPrice)
        errors[`products.${index}.price`] =
          `Preço: no máximo ${LIMITS.productPrice} caracteres.`;
      if (product.description.length > LIMITS.productDescription) {
        errors[`products.${index}.description`] =
          `Descrição: no máximo ${LIMITS.productDescription} caracteres.`;
      }
      products.push(product);
    });
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const profile: BusinessProfile = {
    businessName,
    description,
    products,
    hours,
    rules,
  };
  if (compileKnowledge(profile).length > LIMITS.compiled) {
    return {
      ok: false,
      errors: {
        _: `A ficha é demasiado longa (máximo ${LIMITS.compiled} caracteres no total). Resuma alguns textos.`,
      },
    };
  }
  return { ok: true, profile };
}

// O texto que o agente lê (Workspace.agentKnowledge). Secções vazias não aparecem.
export function compileKnowledge(profile: BusinessProfile): string {
  const parts: string[] = [];

  const about = [
    profile.businessName && `Sobre ${profile.businessName}`,
    profile.description,
  ].filter(Boolean);
  if (about.length) parts.push(about.join("\n"));

  if (profile.products.length) {
    const lines = profile.products.map((p) => {
      let line = `- ${p.name}`;
      if (p.price) line += `: ${p.price}`;
      if (p.description)
        line += `${p.price ? "." : ":"} ${p.description.replace(/\n+/g, " ")}`;
      return line;
    });
    parts.push(["Produtos e serviços", ...lines].join("\n"));
  }

  if (profile.hours) parts.push(`Horários e contactos\n${profile.hours}`);
  if (profile.rules) parts.push(`Regras de atendimento\n${profile.rules}`);

  return parts.join("\n\n");
}
