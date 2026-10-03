// Configuração e validação dos popups de captura de leads. Puro (sem servidor): partilhado pela API, pelo script
// embebível, pelo painel e pelos testes.
import { z } from "zod";
import { normalizePhoneWithDial } from "../contacts/phone.ts";

export const POSITIONS = ["center", "bottom-right", "bottom-left"] as const;
export const POSITION_LABEL: Record<(typeof POSITIONS)[number], string> = { center: "Ao centro", "bottom-right": "Canto inferior direito", "bottom-left": "Canto inferior esquerdo" };
export const TRIGGER_KINDS = ["delay", "exit"] as const;
export const FIELD_MODES = ["off", "optional", "required"] as const;
export const FIELD_LABEL: Record<(typeof FIELD_MODES)[number], string> = { off: "Não pedir", optional: "Opcional", required: "Obrigatório" };

export const MAX_POPUPS = 10;

// "https://www.Loja.pt/algo" -> "loja.pt": só o domínio, sem "www." (o filtro aceita também os subdomínios).
export function normalizeDomain(input: string): string {
  const withoutProtocol = input.trim().toLowerCase().replace(/^[a-z]+:\/\//, "");
  return withoutProtocol.split(/[/?#:]/)[0].replace(/^www\./, "");
}
const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$|^localhost$/;

export const popupConfigSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).default(""),
  buttonText: z.string().trim().min(1).max(30).default("Quero receber"),
  successMessage: z.string().trim().min(1).max(120).default("Obrigado! Entraremos em contacto em breve."),
  consentText: z.string().trim().min(1).max(160).default("Aceito ser contactado por WhatsApp."),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#22c55e"),
  position: z.enum(POSITIONS).default("center"),
  trigger: z.enum(TRIGGER_KINDS).default("delay"),
  delaySeconds: z.number().int().min(0).max(120).default(5),
  askName: z.enum(FIELD_MODES).default("optional"),
  askEmail: z.enum(FIELD_MODES).default("off"),
  // Indicativo aplicado a números sem "+" (só dígitos, ex.: "351"). Vazio = o visitante tem de escrever o "+".
  defaultDialCode: z.string().regex(/^\d{1,4}$/).or(z.literal("")).default(""),
  // Sites autorizados a mostrar o popup. Vazio = qualquer um. Aceita subdomínios.
  allowedDomains: z.array(z.string().transform(normalizeDomain).pipe(z.string().regex(DOMAIN_RE))).max(10).default([]),
  // Dias sem voltar a mostrar a quem fechou ou se registou. 0 = mostra sempre.
  frequencyDays: z.number().int().min(0).max(365).default(7),
});
export type PopupConfig = z.infer<typeof popupConfigSchema>;

export const popupInputSchema = z.object({ name: z.string().trim().min(1).max(80), config: popupConfigSchema });
export type PopupInput = z.infer<typeof popupInputSchema>;

export const parsePopupConfig = (value: unknown): PopupConfig | null => {
  const parsed = popupConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

// Origin ("https://loja.pt") autorizada? Sem lista, qualquer uma. Com lista, o domínio ou um subdomínio dele.
export function originAllowed(origin: string | null, allowed: string[]): boolean {
  if (allowed.length === 0) return true;
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

// Caracteres de controlo e invisíveis fora; sem endereços (spam); espaços normalizados.
const clean = (value: string, max: number) => value.replace(/[\p{Cc}\p{Cf}]/gu, " ").replace(/https?:\/\/\S+|www\.\S+/gi, "").replace(/\s+/g, " ").trim().slice(0, max);
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export const MAX_BODY_BYTES = 4096;

export type SubmissionError = "invalid_input" | "consent_required" | "name_required" | "invalid_phone" | "invalid_email" | "email_required";

export interface CleanSubmission {
  name: string | null;
  phone: string; // só dígitos, formato internacional sem "+"
  email: string | null;
}

// Valida o que o visitante escreveu, segundo a configuração do popup. O telefone é sempre obrigatório (é a
// identidade do contacto no WhatsApp); o nome e o e-mail seguem o que o popup pede.
export function validateSubmission(raw: unknown, config: PopupConfig): { ok: true; data: CleanSubmission } | { ok: false; error: SubmissionError } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "invalid_input" };
  const body = raw as Record<string, unknown>;
  const str = (key: string) => (typeof body[key] === "string" ? (body[key] as string) : "");
  if (body.consent !== true) return { ok: false, error: "consent_required" };

  const phone = normalizePhoneWithDial(str("phone").slice(0, 40), config.defaultDialCode);
  if (!phone) return { ok: false, error: "invalid_phone" };

  const name = config.askName === "off" ? "" : clean(str("name"), 80);
  if (config.askName === "required" && !name) return { ok: false, error: "name_required" };

  let email = "";
  if (config.askEmail !== "off") {
    email = str("email").trim().toLowerCase().slice(0, 254);
    if (config.askEmail === "required" && !email) return { ok: false, error: "email_required" };
    if (email && !EMAIL.test(email)) return { ok: false, error: "invalid_email" };
  }
  return { ok: true, data: { name: name || null, phone, email: email || null } };
}

// Modelos prontos (só texto): "Usar este modelo" preenche o formulário.
export interface PopupPreset {
  id: string;
  title: string;
  description: string;
  input: PopupInput;
}
const base = popupConfigSchema.parse({ title: "x" });
export const POPUP_PRESETS: PopupPreset[] = [
  {
    id: "vip",
    title: "Lista VIP",
    description: "Faixa discreta com um único campo: o WhatsApp. Ideal para lançamentos.",
    input: { name: "Lista VIP", config: { ...base, title: "Entre na lista VIP", description: "Seja o primeiro a saber das novidades e promoções.", buttonText: "Quero entrar", askName: "off", position: "bottom-right", delaySeconds: 8 } },
  },
  {
    id: "welcome",
    title: "Boas-vindas com desconto",
    description: "Convida o visitante a deixar o contacto para receber uma oferta.",
    input: { name: "Desconto de boas-vindas", config: { ...base, title: "Receba 10% de desconto", description: "Deixe o seu WhatsApp e enviamos-lhe o código.", buttonText: "Quero o desconto", askName: "optional", askEmail: "optional", delaySeconds: 6 } },
  },
  {
    id: "exit",
    title: "Antes de sair",
    description: "Aparece quando o visitante vai a sair da página.",
    input: { name: "Antes de sair", config: { ...base, title: "Espere! Fale connosco", description: "Deixe o seu contacto e respondemos às suas dúvidas.", buttonText: "Quero ser contactado", askName: "required", trigger: "exit" } },
  },
];
