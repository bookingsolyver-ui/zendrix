// Linhas de uma proposta. Puro (sem servidor): testável. O total calcula-se SEMPRE aqui, nunca se confia no cliente.
import { z } from "zod";

export const lineSchema = z.object({
  description: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1).max(10_000),
  unitMinor: z.number().int().min(0).max(1_000_000_000),
});
export type ProposalLine = z.infer<typeof lineSchema>;

export const proposalInputSchema = z.object({
  contactId: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(140),
  currency: z.string().trim().length(3).transform((c) => c.toUpperCase()),
  lines: z.array(lineSchema).min(1).max(30),
  sendWhatsApp: z.boolean().optional(),
});

export const totalOf = (lines: ProposalLine[]) => lines.reduce((sum, l) => sum + l.quantity * l.unitMinor, 0);
export const MAX_TOTAL_MINOR = 1_000_000_000_000;

// Uma proposta só se pode aprovar enquanto está enviada e dentro do prazo.
export const isApprovable = (p: { status: string; tokenExpiresAt: Date }, now: Date) => p.status === "SENT" && p.tokenExpiresAt.getTime() > now.getTime();
