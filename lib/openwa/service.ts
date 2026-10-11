import "server-only";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  createWebhook,
  deleteSession,
  getQr,
  OpenWaError,
  sessionState,
  startSession,
  type ConnState,
} from "./client";
import { openWaConfig, QR_PREFIX, sessionNameFor, webhookSecret } from "./config";

// Ciclo de vida do canal WhatsApp por QR de uma organização. Estados da integração (SocialIntegration):
//   QR_PENDING    sessão criada, à espera da leitura do QR (não envia nem conta como canal ligado)
//   ACTIVE        telemóvel ligado
//   DISCONNECTED  sessão terminada no telemóvel
// Uma organização usa UM transporte de WhatsApp de cada vez (Meta oficial OU QR).

export type QrStatus =
  | { ok: true; state: ConnState; qr: string | null }
  | { ok: false; error: "not_configured" | "meta_already_connected" | "openwa_unreachable" | "openwa_error" | "none" };

const encKey = () => process.env.INTEGRATION_ENCRYPTION_KEY ?? "";

async function qrIntegration(workspaceId: string) {
  return prisma.socialIntegration.findFirst({
    where: { workspaceId, platform: "WHATSAPP", providerAccountId: { startsWith: QR_PREFIX } },
    orderBy: { createdAt: "desc" },
    select: { id: true, providerAccountId: true, status: true },
  });
}

const fail = (err: unknown): QrStatus => ({
  ok: false,
  error: err instanceof OpenWaError && err.status === 0 ? "openwa_unreachable" : "openwa_error",
});

// "Conectar WhatsApp": cria a sessão (uma vez), regista o webhook assinado e devolve o QR.
export async function startQrConnection(workspaceId: string, origin: string): Promise<QrStatus> {
  const cfg = openWaConfig();
  if (!cfg) return { ok: false, error: "not_configured" };
  if (!encKey()) return { ok: false, error: "not_configured" };

  const metaActive = await prisma.socialIntegration.findFirst({
    where: { workspaceId, platform: "WHATSAPP", status: "ACTIVE", NOT: { providerAccountId: { startsWith: QR_PREFIX } } },
    select: { id: true },
  });
  if (metaActive) return { ok: false, error: "meta_already_connected" };

  try {
    const existing = await qrIntegration(workspaceId);
    if (existing?.providerAccountId) return await refresh(cfg, existing.providerAccountId.slice(QR_PREFIX.length), true);

    const { id } = await createSession(cfg, sessionNameFor(workspaceId));
    try {
      await createWebhook(cfg, id, { url: `${origin}/api/openwa/webhook`, secret: webhookSecret(id, encKey()) });
      // O OpenWA não usa este valor; o campo é obrigatório e cifrado como os tokens da Meta.
      await prisma.socialIntegration.create({
        data: {
          workspaceId,
          platform: "WHATSAPP",
          providerAccountId: `${QR_PREFIX}${id}`,
          accessToken: encryptSecret("openwa"),
          status: "QR_PENDING",
          tokenExpiresAt: null,
        },
      });
      await startSession(cfg, id);
    } catch (err) {
      await deleteSession(cfg, id).catch(() => {}); // não deixa uma sessão órfã no servidor
      throw err;
    }
    return { ok: true, state: "connecting", qr: await getQr(cfg, id) };
  } catch (err) {
    console.error("[openwa] start falhou:", err instanceof Error ? err.message : "unknown");
    return fail(err);
  }
}

async function refresh(cfg: NonNullable<ReturnType<typeof openWaConfig>>, id: string, startIfStopped: boolean): Promise<QrStatus> {
  let state = await sessionState(cfg, id);
  if (state === "close" && startIfStopped) {
    await startSession(cfg, id).catch(() => {});
    state = "connecting";
  }
  return { ok: true, state, qr: state === "open" ? null : await getQr(cfg, id) };
}

// Polling da UI: estado atual (e QR novo enquanto não ligar). Sincroniza a base de dados se o webhook falhou.
export async function qrStatus(workspaceId: string): Promise<QrStatus> {
  const cfg = openWaConfig();
  if (!cfg) return { ok: false, error: "not_configured" };
  const integration = await qrIntegration(workspaceId);
  if (!integration?.providerAccountId) return { ok: false, error: "none" };
  try {
    const result = await refresh(cfg, integration.providerAccountId.slice(QR_PREFIX.length), false);
    if (result.ok) await syncStatus(integration.id, integration.status, result.state);
    return result;
  } catch (err) {
    return fail(err);
  }
}

// Reflete o estado do OpenWA na integração. open -> ACTIVE; close depois de ativa -> DISCONNECTED.
export async function syncStatus(integrationId: string, current: string, state: ConnState) {
  const next = state === "open" ? "ACTIVE" : state === "close" && current === "ACTIVE" ? "DISCONNECTED" : null;
  if (!next || next === current) return;
  await prisma.socialIntegration.updateMany({ where: { id: integrationId, status: current }, data: { status: next } });
}

export async function disconnectQr(workspaceId: string): Promise<boolean> {
  const integration = await qrIntegration(workspaceId);
  if (!integration?.providerAccountId) return true;
  const cfg = openWaConfig();
  if (cfg) {
    try {
      await deleteSession(cfg, integration.providerAccountId.slice(QR_PREFIX.length));
    } catch (err) {
      // 404 = já não existe; outra falha: mantém a ligação para não deixar a sessão órfã no servidor.
      if (!(err instanceof OpenWaError && err.status === 404)) return false;
    }
  }
  await prisma.socialIntegration.delete({ where: { id: integration.id } });
  return true;
}

// Estado do canal QR da organização para o aviso do painel. Nunca lança e responde em poucos segundos. Em cache
// durante 30 s por organização (o painel é pedido a cada navegação). «unreachable» NÃO marca a ligação como perdida:
// um servidor OpenWA em baixo não quer dizer que o telemóvel se desligou.
export type QrChannelHealth = "none" | "open" | "connecting" | "lost" | "unreachable";

const healthCache = new Map<string, { at: number; value: QrChannelHealth }>();
const HEALTH_TTL_MS = 30_000;

export async function qrChannelHealth(workspaceId: string): Promise<QrChannelHealth> {
  const cached = healthCache.get(workspaceId);
  if (cached && Date.now() - cached.at < HEALTH_TTL_MS) return cached.value;

  let value: QrChannelHealth = "none";
  try {
    const integration = await qrIntegration(workspaceId);
    const cfg = openWaConfig();
    if (integration?.providerAccountId) {
      if (!cfg) {
        value = "unreachable";
      } else {
        try {
          const state = await sessionState(cfg, integration.providerAccountId.slice(QR_PREFIX.length), 4_000);
          await syncStatus(integration.id, integration.status, state);
          value = state === "open" ? "open" : state === "connecting" ? "connecting" : "lost";
        } catch (err) {
          // 404 = a sessão já não existe no servidor (apagada): perdida. Qualquer outra falha = servidor inacessível.
          value = err instanceof OpenWaError && err.status === 404 ? "lost" : "unreachable";
          if (value === "lost") {
            await prisma.socialIntegration.updateMany({ where: { id: integration.id, status: "ACTIVE" }, data: { status: "DISCONNECTED" } });
          }
        }
        if (value === "unreachable") console.warn("[openwa] servidor inacessível ao verificar o canal de", workspaceId);
        if (value === "lost") console.error("[openwa] a ligação do WhatsApp por QR foi perdida:", workspaceId);
      }
    }
  } catch (err) {
    console.error("[openwa] verificação do canal falhou:", err instanceof Error ? err.name : "unknown");
    value = "unreachable";
  }
  healthCache.set(workspaceId, { at: Date.now(), value });
  if (healthCache.size > 200) healthCache.clear();
  return value;
}
