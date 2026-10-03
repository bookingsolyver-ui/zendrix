import { z } from "zod";

// Convidar: o papel OWNER nunca se atribui por convite. `locale` só serve para o link ir na língua certa.
export const inviteSchema = z.strictObject({
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(["MANAGER", "STAFF"]).default("STAFF"),
  locale: z.string().max(8).optional(),
});

export const memberRoleSchema = z.strictObject({ role: z.enum(["MANAGER", "STAFF"]) });

export const idSchema = z.string().min(1).max(64);

// Aceitar um convite. O e-mail NÃO vem do pedido: vem do convite (não se pode usar o link com outro e-mail).
export const acceptInviteSchema = z.strictObject({
  token: z.string().length(43),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(128),
});
