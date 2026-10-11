import "server-only";
import { prisma } from "@/lib/prisma";
import { QR_PREFIX } from "./config";

// Validação de tenant do canal QR. A verdade está SEMPRE na base de dados (SocialIntegration), nunca no que o
// browser ou o corpo de um pedido diz:
//   * o tenant de um pedido vem da sessão autenticada (requireRole), nunca de um parâmetro do cliente;
//   * o id da sessão do OpenWA é lido da linha desse tenant, nunca aceite de fora;
//   * a unicidade (platform, providerAccountId) garante que uma sessão tem um único dono.
// Um `tenant_id` enviado pelo frontend seria uma porta para IDOR: por isso o componente não envia nenhum.

export interface TenantQrSession {
  integrationId: string;
  workspaceId: string;
  sessionId: string;
  status: string;
}

const select = {
  id: true,
  workspaceId: true,
  providerAccountId: true,
  status: true,
} as const;

function shape(
  row: {
    id: string;
    workspaceId: string;
    providerAccountId: string | null;
    status: string;
  } | null,
): TenantQrSession | null {
  if (!row?.providerAccountId?.startsWith(QR_PREFIX)) return null;
  return {
    integrationId: row.id,
    workspaceId: row.workspaceId,
    sessionId: row.providerAccountId.slice(QR_PREFIX.length),
    status: row.status,
  };
}

// A sessão QR de uma organização (a mais recente), ou null.
export async function tenantQrSession(
  workspaceId: string,
): Promise<TenantQrSession | null> {
  return shape(
    await prisma.socialIntegration.findFirst({
      where: {
        workspaceId,
        platform: "WHATSAPP",
        providerAccountId: { startsWith: QR_PREFIX },
      },
      orderBy: { createdAt: "desc" },
      select,
    }),
  );
}

// A quem pertence uma sessão do OpenWA (para eventos que chegam só com o id da sessão).
export async function sessionTenant(
  sessionId: string,
): Promise<TenantQrSession | null> {
  return shape(
    await prisma.socialIntegration.findFirst({
      where: {
        platform: "WHATSAPP",
        providerAccountId: `${QR_PREFIX}${sessionId}`,
      },
      select,
    }),
  );
}

// Esta sessão é mesmo deste tenant e está num estado em que pode enviar/receber? Usar antes de qualquer envio ou
// leitura que receba um id de sessão de fora (webhook, jobs).
export async function sessionOwnedBy(
  sessionId: string,
  workspaceId: string,
  opts: { activeOnly?: boolean } = {},
): Promise<boolean> {
  const owner = await sessionTenant(sessionId);
  if (!owner || owner.workspaceId !== workspaceId) return false;
  return opts.activeOnly ? owner.status === "ACTIVE" : true;
}
