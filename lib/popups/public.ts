import "server-only";
import { getAccess } from "@/lib/billing/access";
import { prisma } from "@/lib/prisma";
import { originAllowed, parsePopupConfig, type PopupConfig } from "@/lib/popups/schema";

// Tudo o que as rotas PÚBLICAS dos popups (o script, as visualizações e os registos) partilham. Estas rotas são
// chamadas a partir de sites de terceiros, sem sessão: por isso não usam a verificação de mesma origem das rotas
// do painel, e confiam só na chave pública do popup, na lista de domínios, nos limites de pedidos e na validação.

export const KEY_RE = /^[A-Za-z0-9_-]{8,40}$/;

export interface PublicPopup {
  id: string;
  workspaceId: string;
  config: PopupConfig;
}

// O popup só está "disponível" se existe, está ativo, a configuração é válida e a organização tem plano ativo.
export async function loadPublicPopup(key: string): Promise<PublicPopup | null> {
  if (!KEY_RE.test(key)) return null;
  const popup = await prisma.popup.findUnique({ where: { publicKey: key }, select: { id: true, workspaceId: true, active: true, config: true } });
  if (!popup || !popup.active) return null;
  const config = parsePopupConfig(popup.config);
  if (!config) return null;
  if (!(await getAccess(popup.workspaceId)).active) return null;
  return { id: popup.id, workspaceId: popup.workspaceId, config };
}

// CORS: sem lista de domínios o popup funciona em qualquer site (é para isso que existe); com lista, só devolve a
// origem autorizada (e "Vary: Origin" para as caches não misturarem).
export function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const base = { "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" };
  if (allowed.length === 0) return { ...base, "Access-Control-Allow-Origin": "*" };
  return originAllowed(origin, allowed) && origin ? { ...base, "Access-Control-Allow-Origin": origin, Vary: "Origin" } : { ...base, Vary: "Origin" };
}

export const preflight = (origin: string | null, allowed: string[] = []) => new Response(null, { status: 204, headers: corsHeaders(origin, allowed) });

export const json = (body: unknown, status: number, headers: Record<string, string>) => Response.json(body, { status, headers: { ...headers, "Cache-Control": "no-store" } });

// Cria (ou reaproveita) o contacto e regista o envio, com o consentimento que a pessoa aceitou. Nunca revela se o
// contacto já existia, e nunca apaga nem sobrescreve o que já se sabe dele.
export async function captureLead(input: { popup: PublicPopup; data: { name: string | null; phone: string; email: string | null } }): Promise<{ created: boolean }> {
  const { popup, data } = input;
  const where = { workspaceId_platform_waId: { workspaceId: popup.workspaceId, platform: "WHATSAPP" as const, waId: data.phone } };
  let created = false;

  let contact = await prisma.contact.findUnique({ where, select: { id: true, name: true, email: true } });
  if (!contact) {
    try {
      contact = await prisma.contact.create({ data: { workspaceId: popup.workspaceId, platform: "WHATSAPP", waId: data.phone, name: data.name, email: data.email }, select: { id: true, name: true, email: true } });
      created = true;
    } catch {
      // Dois registos ao mesmo tempo para o mesmo número: o outro ganhou; reaproveita-se o dele.
      contact = await prisma.contact.findUnique({ where, select: { id: true, name: true, email: true } });
    }
  }
  if (!contact) throw new Error("contact_unavailable");

  if (!created && ((!contact.name && data.name) || (!contact.email && data.email))) {
    await prisma.contact.update({ where: { id: contact.id }, data: { ...(!contact.name && data.name ? { name: data.name } : {}), ...(!contact.email && data.email ? { email: data.email } : {}) } });
  }
  await prisma.popupSubmission.create({ data: { popupId: popup.id, workspaceId: popup.workspaceId, contactId: contact.id, consentText: popup.config.consentText } });
  return { created };
}
