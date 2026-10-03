// Validação dos avisos do sistema escritos pelo administrador. Puro (sem servidor).
import { z } from "zod";

export const NOTICE_AUDIENCES = ["all", "active"] as const;
export const NOTICE_AUDIENCE_LABEL: Record<(typeof NOTICE_AUDIENCES)[number], string> = { all: "Todas as organizações aprovadas", active: "Só organizações com subscrição ativa" };
export const MAX_NOTICE_RECIPIENTS = 2000;

const text = z.object({ subject: z.string().trim().min(3).max(150), body: z.string().trim().min(10).max(5000) });

export const noticeInputSchema = z
  .object({
    mode: z.enum(["test", "send"]),
    kind: z.enum(["maintenance", "notice"]),
    audience: z.enum(NOTICE_AUDIENCES).default("all"),
    // Opcional: limita o aviso a estas organizações (um aviso dirigido). Sem isto vai a todo o público escolhido.
    workspaceIds: z.array(z.string().min(1).max(64)).min(1).max(200).optional(),
    startsAt: z.string().datetime().nullish(),
    endsAt: z.string().datetime().nullish(),
    // O português é obrigatório; as outras línguas, se faltarem, usam-no.
    content: z.object({ pt: text, en: text.optional(), es: text.optional() }),
    // Língua do e-mail de teste.
    testLang: z.enum(["pt", "en", "es"]).default("pt"),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "maintenance" && !value.startsAt) ctx.addIssue({ code: "custom", path: ["startsAt"], message: "start_required" });
    if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "end_before_start" });
  });
export type NoticeInput = z.infer<typeof noticeInputSchema>;

// Só se mostra parte do e-mail na lista de erros: o administrador reconhece o destinatário sem o ver inteiro.
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  return `${local.slice(0, 1)}•••@${domain}`;
}
