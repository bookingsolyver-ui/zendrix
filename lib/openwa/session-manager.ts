import "server-only";
import { Prisma } from "@prisma/client";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  createWebhook,
  deleteSession,
  forceKillSession,
  getQr,
  listSessions,
  OpenWaError,
  sessionState,
  startSession,
  type ConnState,
} from "./client";
import {
  openWaConfig,
  QR_PREFIX,
  webhookSecret,
  type OpenWaConfig,
} from "./config";
import { syncStatus } from "./service";
import { tenantQrSession, type TenantQrSession } from "./tenant-guard";
import {
  decideOrphan,
  isStale,
  LOCK_TTL_MS,
  QR_PENDING_TTL_MS,
  tenantSessionName,
} from "./tenant-session";

// Gestor de sessões OpenWA POR TENANT (organização). Uma organização = uma sessão do OpenWA, com nome único por
// geração, criada sob um «lock» por tenant (nunca duas criações em simultâneo para o mesmo tenant, mesmo entre
// instâncias serverless diferentes). O que é de um tenant nunca toca no de outro: o estado vive em linhas por
// workspaceId e o tenant vem sempre da sessão autenticada (ver tenant-guard.ts).
//
// O OpenWA é um servidor à parte (VPS); isto é o plano de controlo que corre na Vercel. Não há Baileys aqui.

export type TenantQrResult =
  | { ok: true; state: ConnState; qr: string | null; gone?: boolean }
  | {
      ok: false;
      error:
        | "not_configured"
        | "meta_already_connected"
        | "openwa_unreachable"
        | "openwa_error"
        | "already_connected"
        | "none";
    };

const LOCK_PLATFORM = "WA_QR_LOCK"; // `platform` é texto livre: nenhuma consulta por "WHATSAPP" vê estas linhas
const encKey = () => process.env.INTEGRATION_ENCRYPTION_KEY ?? "";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | "timeout"> {
  return Promise.race([
    promise,
    new Promise<"timeout">((resolve) =>
      setTimeout(() => resolve("timeout"), ms),
    ),
  ]);
}

const isStatus = (err: unknown, ...codes: number[]) =>
  err instanceof OpenWaError && codes.includes(err.status);

function failure(err: unknown): TenantQrResult {
  return {
    ok: false,
    error:
      err instanceof OpenWaError && err.status === 0
        ? "openwa_unreachable"
        : "openwa_error",
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Lock por tenant. A restrição única (platform, providerAccountId) da base de dados faz de exclusão mútua:
// só um INSERT ganha. Um lock esquecido (função cortada a meio) expira em LOCK_TTL_MS e é tomado por
// compare-and-swap sobre `createdAt`.

async function acquireLock(
  workspaceId: string,
): Promise<(() => Promise<void>) | null> {
  const release = (id: string, token: Date) => async () => {
    await prisma.socialIntegration
      .deleteMany({ where: { id, createdAt: token } })
      .catch(() => {});
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const row = await prisma.socialIntegration.create({
        data: {
          workspaceId,
          platform: LOCK_PLATFORM,
          providerAccountId: workspaceId,
          accessToken: "lock",
          status: "LOCKED",
        },
        select: { id: true, createdAt: true },
      });
      return release(row.id, row.createdAt);
    } catch (err) {
      if (!(
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ))
        throw err;
    }
    const held = await prisma.socialIntegration.findFirst({
      where: { platform: LOCK_PLATFORM, providerAccountId: workspaceId },
      select: { id: true, createdAt: true },
    });
    if (!held) continue; // libertado entretanto: tenta de novo
    if (!isStale(held.createdAt, LOCK_TTL_MS)) return null;
    const token = new Date();
    const stolen = await prisma.socialIntegration.updateMany({
      where: { id: held.id, createdAt: held.createdAt },
      data: { createdAt: token },
    });
    return stolen.count === 1 ? release(held.id, token) : null;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Apagar sessões presas, com tolerância ao que o OpenWA devolve de verdade:
//   404 = já não existe (conta como apagada); 409 SESSION_NAME_TEARDOWN_PENDING = repetir daqui a pouco.
async function deleteSessionResilient(
  cfg: OpenWaConfig,
  id: string,
): Promise<boolean> {
  await forceKillSession(cfg, id).catch(() => {}); // 400 se não arrancou: irrelevante
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await deleteSession(cfg, id);
      return true;
    } catch (err) {
      if (isStatus(err, 404)) return true;
      if (isStatus(err, 409) && attempt < 2) {
        await sleep(1_500);
        continue;
      }
      console.error(
        "[openwa/gc] não foi possível apagar a sessão",
        id,
        err instanceof Error ? err.message : "unknown",
      );
      return false;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------------------------------------------
// Estado atual (SSE e polling). Nunca cria nada. 404 = a sessão desapareceu do servidor: `gone`, e o painel
// oferece «Gerar novo QR» em vez de um erro opaco.
export async function readTenantQr(
  workspaceId: string,
): Promise<TenantQrResult> {
  const cfg = openWaConfig();
  if (!cfg) return { ok: false, error: "not_configured" };
  const session = await tenantQrSession(workspaceId);
  if (!session) return { ok: false, error: "none" };
  try {
    const state = await sessionState(cfg, session.sessionId, 8_000);
    await syncStatus(session.integrationId, session.status, state);
    return {
      ok: true,
      state,
      qr: state === "connecting" ? await getQr(cfg, session.sessionId) : null,
    };
  } catch (err) {
    if (isStatus(err, 404))
      return { ok: true, state: "close", qr: null, gone: true };
    return failure(err);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// «Conectar WhatsApp» / «Gerar novo QR». `fresh: true` descarta a sessão atual (se não estiver ligada) e cria
// uma nova com nome novo. Idempotente: pedidos repetidos em simultâneo devolvem «a preparar» em vez de colidir.
export async function connectTenantQr(
  workspaceId: string,
  origin: string,
  opts: { fresh?: boolean } = {},
): Promise<TenantQrResult> {
  const cfg = openWaConfig();
  if (!cfg || !encKey()) return { ok: false, error: "not_configured" };

  const metaActive = await prisma.socialIntegration.findFirst({
    where: {
      workspaceId,
      platform: "WHATSAPP",
      status: "ACTIVE",
      NOT: { providerAccountId: { startsWith: QR_PREFIX } },
    },
    select: { id: true },
  });
  if (metaActive) return { ok: false, error: "meta_already_connected" };

  const release = await acquireLock(workspaceId);
  if (!release) return { ok: true, state: "connecting", qr: null }; // outra criação deste tenant em curso

  try {
    const existing = await tenantQrSession(workspaceId);
    if (!existing) return await provision(cfg, workspaceId, origin, null);

    if (opts.fresh) {
      // Nunca deita fora um número ligado por engano: para recomeçar, desliga-se primeiro.
      if (existing.status === "ACTIVE")
        return { ok: false, error: "already_connected" };
      // O webhook pode ter-se perdido: se o OpenWA diz que está ligada, sincroniza e recusa em vez de a desligar.
      const live = await sessionState(cfg, existing.sessionId, 8_000).catch(
        () => null,
      );
      if (live === "open") {
        await syncStatus(existing.integrationId, existing.status, live);
        return { ok: false, error: "already_connected" };
      }
      return await provision(cfg, workspaceId, origin, existing);
    }

    let state: ConnState;
    try {
      state = await sessionState(cfg, existing.sessionId);
    } catch (err) {
      if (isStatus(err, 404))
        return await provision(cfg, workspaceId, origin, existing); // sessão perdida no servidor
      throw err;
    }
    if (state === "open") {
      await syncStatus(existing.integrationId, existing.status, state);
      return { ok: true, state, qr: null };
    }
    if (state === "connecting")
      return { ok: true, state, qr: await getQr(cfg, existing.sessionId) };
    // close: um número que já esteve ligado tenta retomar com as credenciais; um QR que nunca chegou a ligar é refeito.
    if (existing.status === "QR_PENDING")
      return await provision(cfg, workspaceId, origin, existing);
    await startSession(cfg, existing.sessionId).catch((err) => {
      if (!isStatus(err, 409)) throw err;
    });
    return {
      ok: true,
      state: "connecting",
      qr: await getQr(cfg, existing.sessionId),
    };
  } catch (err) {
    console.error(
      "[openwa/session] connect falhou:",
      err instanceof Error ? err.message : "unknown",
    );
    return failure(err);
  } finally {
    await release();
  }
}

// Cria a sessão nova ANTES de largar a antiga, e só passa a linha da base de dados para a nova depois de o
// webhook estar registado: uma falha a meio nunca deixa o tenant sem sessão nem uma sessão sem dono.
async function provision(
  cfg: OpenWaConfig,
  workspaceId: string,
  origin: string,
  existing: TenantQrSession | null,
): Promise<TenantQrResult> {
  let created: { id: string } | null = null;
  for (let attempt = 0; attempt < 2 && !created; attempt++) {
    try {
      created = await createSession(cfg, tenantSessionName(workspaceId)); // nonce novo a cada tentativa
    } catch (err) {
      if (!(isStatus(err, 409) && attempt === 0)) throw err;
    }
  }
  if (!created) throw new OpenWaError(502, "openwa_bad_response");
  const newId = created.id;

  let persisted = false;
  try {
    await createWebhook(cfg, newId, {
      url: `${origin}/api/openwa/webhook`,
      secret: webhookSecret(newId, encKey()),
    });
    // Linha ANTES do arranque: os eventos do arranque já têm de saber de quem são.
    if (existing) {
      await prisma.socialIntegration.update({
        where: { id: existing.integrationId },
        data: {
          providerAccountId: `${QR_PREFIX}${newId}`,
          status: "QR_PENDING",
          createdAt: new Date(),
        },
      });
    } else {
      await prisma.socialIntegration.create({
        data: {
          workspaceId,
          platform: "WHATSAPP",
          providerAccountId: `${QR_PREFIX}${newId}`,
          accessToken: encryptSecret("openwa"), // campo obrigatório; o OpenWA autentica-se por X-API-Key
          status: "QR_PENDING",
          tokenExpiresAt: null,
        },
      });
    }
    persisted = true;
    await startSession(cfg, newId).catch((err) => {
      if (!isStatus(err, 409)) throw err;
    });
  } catch (err) {
    if (persisted) {
      // desfaz a ligação à sessão nova: a antiga (se existia) continua a ser a do tenant
      if (existing) {
        await prisma.socialIntegration
          .update({
            where: { id: existing.integrationId },
            data: {
              providerAccountId: `${QR_PREFIX}${existing.sessionId}`,
              status: existing.status,
            },
          })
          .catch(() => {});
      } else {
        await prisma.socialIntegration
          .deleteMany({
            where: {
              workspaceId,
              platform: "WHATSAPP",
              providerAccountId: `${QR_PREFIX}${newId}`,
            },
          })
          .catch(() => {});
      }
    }
    await deleteSessionResilient(cfg, newId); // sem sessão órfã no servidor
    throw err;
  }

  // A sessão antiga (presa) sai do servidor, com tempo limitado: o que sobrar a limpeza periódica apanha.
  if (existing)
    await withTimeout(deleteSessionResilient(cfg, existing.sessionId), 12_000);

  return { ok: true, state: "connecting", qr: await getQr(cfg, newId) };
}

// ---------------------------------------------------------------------------------------------------------------
// Garbage collection (cron). Três coisas, todas limitadas por tempo e por quantidade, e nenhuma toca numa sessão
// ligada (ACTIVE / ready):
//   1. Linhas QR_PENDING abandonadas (o utilizador abriu o QR e fechou a página): apaga sessão e linha.
//   2. Locks de criação esquecidos.
//   3. Sessões do OpenWA com o nosso prefixo sem dono na base de dados (criação que falhou a meio).

export interface SweepSummary {
  pendingRemoved: number;
  pendingFailed: number;
  locksRemoved: number;
  orphansRemoved: number;
  orphansFailed: number;
  serverSessions: number | null;
}

export async function sweepOrphanQrSessions(
  opts: { budgetMs?: number; maxDeletes?: number } = {},
): Promise<SweepSummary> {
  const deadline = Date.now() + (opts.budgetMs ?? 45_000);
  let deletesLeft = opts.maxDeletes ?? 50;
  const out: SweepSummary = {
    pendingRemoved: 0,
    pendingFailed: 0,
    locksRemoved: 0,
    orphansRemoved: 0,
    orphansFailed: 0,
    serverSessions: null,
  };
  const cfg = openWaConfig();
  const live = () => Date.now() < deadline && deletesLeft > 0;

  out.locksRemoved = (
    await prisma.socialIntegration.deleteMany({
      where: {
        platform: LOCK_PLATFORM,
        createdAt: { lt: new Date(Date.now() - 10 * 60 * 1000) },
      },
    })
  ).count;

  if (!cfg) return out;

  // 1. QR por ler há demasiado tempo
  const pending = await prisma.socialIntegration.findMany({
    where: {
      platform: "WHATSAPP",
      status: "QR_PENDING",
      providerAccountId: { startsWith: QR_PREFIX },
      createdAt: { lt: new Date(Date.now() - QR_PENDING_TTL_MS) },
    },
    select: { id: true, providerAccountId: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  for (const row of pending) {
    if (!live()) break;
    const sessionId = row.providerAccountId!.slice(QR_PREFIX.length);
    // Ligou entretanto (webhook perdido)? Sincroniza e deixa em paz: nunca desligar um telemóvel acabado de ligar.
    const current = await sessionState(cfg, sessionId, 8_000).catch(() => null);
    if (current === "open") {
      await syncStatus(row.id, "QR_PENDING", current);
      continue;
    }
    deletesLeft--;
    const gone = await deleteSessionResilient(cfg, sessionId);
    if (gone) {
      // a condição de estado protege contra um QR que ligou entre a leitura e agora
      const { count } = await prisma.socialIntegration.deleteMany({
        where: { id: row.id, status: "QR_PENDING" },
      });
      out.pendingRemoved += count;
    } else {
      out.pendingFailed++;
    }
  }

  // 3. órfãs no servidor
  if (!live()) return out;
  // listSessions nunca lança e já registou o motivo ([openwa/list-sessions-error]); null = salta esta fase.
  const sessions = await listSessions(cfg, 20_000);
  if (!sessions) return out;
  out.serverSessions = sessions.length;
  const ours = sessions.filter(
    (s) =>
      decideOrphan({
        name: s.name,
        status: s.status,
        createdAt: s.createdAt,
        knownInDb: false,
      }) === "delete",
  );
  if (ours.length === 0) return out;
  const known = new Set(
    (
      await prisma.socialIntegration.findMany({
        where: {
          platform: "WHATSAPP",
          providerAccountId: { in: ours.map((s) => `${QR_PREFIX}${s.id}`) },
        },
        select: { providerAccountId: true },
      })
    ).map((r) => r.providerAccountId),
  );
  for (const s of ours) {
    if (!live()) break;
    if (known.has(`${QR_PREFIX}${s.id}`)) continue;
    deletesLeft--;
    if (await deleteSessionResilient(cfg, s.id)) out.orphansRemoved++;
    else out.orphansFailed++;
  }
  return out;
}
