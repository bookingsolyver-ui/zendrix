import "server-only";
import { getAccess } from "@/lib/billing/access";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { backoffSeconds, MAX_ATTEMPTS } from "@/lib/meta/errors";
import { markIntegrationExpired } from "@/lib/meta/integration-health";
import { sendTextToMeta, type MetaSendResult } from "@/lib/meta/send";
import { sendTemplateToMeta } from "@/lib/meta/templates-api";
import { rateLimit } from "@/lib/rate-limit";
import type { PlatformName } from "@/lib/outbox/split-text";
import { outboxPayloadSchema, type OutboxPayload } from "@/lib/validations/outbox";

// O motor da fila de saída. Quem o chama (o cron e, logo a seguir a enfileirar, a IA e a Inbox) pode correr
// em várias instâncias ao mesmo tempo, e isso é seguro:
//  * Reivindicar é UMA instrução (UPDATE ... FOR UPDATE SKIP LOCKED): dois workers nunca recebem a mesma linha.
//  * Mensagens para o MESMO destinatário vão em série e por ordem; destinatários diferentes em paralelo,
//    em lotes limitados (CONCURRENCY), para não rebentar os nossos recursos nem a Graph API.
//  * Há um teto de mensagens por segundo por conta da Meta (OUTBOX_PER_SECOND), partilhado entre workers
//    (usa o rate limit da base de dados): o que passa do teto é adiado 1 s, não perdido.
//  * Uma mensagem NUNCA é reenviada se não sabemos se a Meta a entregou (worker morto a meio): fica FAILED.
//    Um duplicado ao cliente é pior do que uma falha visível na Inbox.

const DEFAULT_LIMIT = 50;
const CONCURRENCY = 10;
const STALE_AFTER_MS = 10 * 60 * 1000;
const SENT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const CLEANUP_PROBABILITY = 1 / 50;
const DEFAULT_PER_SECOND = 20;

export interface ProcessOptions {
  limit?: number;
  concurrency?: number;
  // Instante (ms epoch) a partir do qual não se começa mais trabalho; o que ficou por tentar volta à fila.
  deadlineAt?: number;
}

export interface ProcessSummary {
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  deferred: number;
}

interface ClaimedRow {
  id: string;
  workspaceId: string;
  platform: PlatformName;
  payload: unknown;
  retryCount: number;
  createdAt: Date;
}

type Outcome = "sent" | "retried" | "failed" | "deferred";

interface Credentials {
  integrationId: string;
  accessToken: string;
  accountId: string;
  pageId: string | null;
}

const perSecond = () => Number(process.env.OUTBOX_PER_SECOND) || DEFAULT_PER_SECOND;

// ---------------------------------------------------------------------------------------------- reivindicar
async function claim(limit: number): Promise<ClaimedRow[]> {
  const rows = await prisma.$queryRaw<ClaimedRow[]>`
    WITH picked AS (
      SELECT "id" FROM "OutboxMessage"
      WHERE "status" = 'PENDING' AND "nextAttemptAt" <= timezone('utc', now())
      ORDER BY "createdAt" ASC
      LIMIT ${limit}::int
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "OutboxMessage" AS o
    SET "status" = 'PROCESSING', "updatedAt" = timezone('utc', now())
    FROM picked
    WHERE o."id" = picked."id"
    RETURNING o."id", o."workspaceId", o."platform", o."payload", o."retryCount", o."createdAt"
  `;
  return rows; // o RETURNING não garante ordem: quem usa ordena por createdAt
}

// Linhas em PROCESSING há muito tempo: o worker morreu a meio. Não se reenvia (ver acima).
async function failStale() {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const stale = await prisma.outboxMessage.findMany({
    where: { status: "PROCESSING", updatedAt: { lt: cutoff } },
    take: 100,
    select: { id: true, payload: true },
  });
  if (stale.length === 0) return;

  const reason = "worker_interrupted";
  await prisma.outboxMessage.updateMany({
    where: { id: { in: stale.map((r) => r.id) }, status: "PROCESSING" },
    data: { status: "FAILED", errorMessage: reason },
  });
  const messageIds = stale.flatMap((r) => {
    const parsed = outboxPayloadSchema.safeParse(r.payload);
    return parsed.success ? [parsed.data.messageId] : [];
  });
  if (messageIds.length) {
    await prisma.message.updateMany({
      where: { id: { in: messageIds }, status: "QUEUED" },
      data: { status: "FAILED", errorMessage: reason },
    });
  }
  console.warn(`[outbox] ${stale.length} mensagem(ns) ficaram a meio de um envio e foram marcadas FAILED`);
}

async function release(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.outboxMessage.updateMany({
    where: { id: { in: ids }, status: "PROCESSING" },
    data: { status: "PENDING" },
  });
}

// ------------------------------------------------------------------------------------------------- uma mensagem
async function credentialsFor(cache: Map<string, Credentials | null>, row: ClaimedRow): Promise<Credentials | null> {
  const key = `${row.workspaceId}|${row.platform}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  const integration = await prisma.socialIntegration.findFirst({
    where: { workspaceId: row.workspaceId, platform: row.platform, status: "ACTIVE", providerAccountId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { id: true, accessToken: true, providerAccountId: true, pageId: true },
  });
  let credentials: Credentials | null = null;
  if (integration?.providerAccountId) {
    try {
      credentials = {
        integrationId: integration.id,
        accessToken: decryptSecret(integration.accessToken),
        accountId: integration.providerAccountId,
        pageId: integration.pageId,
      };
    } catch {
      credentials = null; // token ilegível: falha permanente, registada abaixo
    }
  }
  cache.set(key, credentials);
  return credentials;
}

async function markFailed(row: ClaimedRow, payload: OutboxPayload | null, reason: string): Promise<Outcome> {
  await prisma.outboxMessage.update({
    where: { id: row.id },
    data: { status: "FAILED", retryCount: row.retryCount + 1, errorMessage: reason.slice(0, 300) },
  });
  if (payload) {
    await prisma.message.updateMany({
      where: { id: payload.messageId, status: "QUEUED" },
      data: { status: "FAILED", errorMessage: reason.slice(0, 120) },
    });
  }
  return "failed";
}

async function processOne(row: ClaimedRow, cache: Map<string, Credentials | null>): Promise<Outcome> {
  // Tudo até ao envio é preparação: se algo falhar aqui (base de dados...), a Meta ainda não viu nada e a
  // linha volta à fila. Depois do envio, um erro NÃO a devolve (ver o cabeçalho: nunca reenviar sem saber).
  let ready: { payload: OutboxPayload; credentials: Credentials } | Outcome;
  try {
    ready = await prepare(row, cache);
  } catch (err) {
    await release([row.id]).catch(() => {});
    throw err;
  }
  if (typeof ready === "string") return ready;
  return deliver(row, ready.payload, ready.credentials, cache);
}

async function prepare(
  row: ClaimedRow,
  cache: Map<string, Credentials | null>,
): Promise<{ payload: OutboxPayload; credentials: Credentials } | Outcome> {
  const parsed = outboxPayloadSchema.safeParse(
    typeof row.payload === "string" ? safeJson(row.payload) : row.payload,
  );
  if (!parsed.success) return markFailed(row, null, "invalid_payload");
  const payload = parsed.data;

  // PAYWALL: o plano pode ter caducado DEPOIS de a mensagem ser enfileirada. Sem plano ativo não sai.
  if (!(await getAccess(row.workspaceId)).active) return markFailed(row, payload, "subscription_required");

  const credentials = await credentialsFor(cache, row);
  if (!credentials) return markFailed(row, payload, "no_integration");

  // Teto de envios por segundo para esta conta da Meta, partilhado por todos os workers.
  const pace = await rateLimit(`outbox:${row.platform}:${credentials.accountId}`, {
    limit: perSecond(),
    windowMs: 1000,
  });
  if (!pace.ok) {
    await prisma.outboxMessage.update({
      where: { id: row.id },
      data: { status: "PENDING", nextAttemptAt: new Date(Date.now() + 1000 * Math.max(1, pace.retryAfterSeconds)) },
    });
    return "deferred";
  }
  return { payload, credentials };
}

async function deliver(
  row: ClaimedRow,
  payload: OutboxPayload,
  credentials: Credentials,
  cache: Map<string, Credentials | null>,
): Promise<Outcome> {
  // Modelo aprovado (WhatsApp): mesmo caminho de resultado que o texto, só muda o pedido à Meta.
  const result =
    payload.kind === "template"
      ? await sendTemplateResult(credentials, payload)
      : await sendTextToMeta(row.platform, credentials, payload.to, payload.text);

  if (result.ok) {
    // A Meta já entregou. Se esta gravação falhar, a linha fica PROCESSING e acaba FAILED (nunca reenvia).
    await prisma.$transaction([
      prisma.outboxMessage.update({
        where: { id: row.id },
        data: { status: "SENT", errorMessage: null },
      }),
      prisma.message.updateMany({
        where: { id: payload.messageId, status: "QUEUED" },
        data: { status: "SENT", waMessageId: result.externalId },
      }),
    ]);
    return "sent";
  }

  // A Meta recusou o token: marca a integração (os envios seguintes falham logo e o painel avisa) e limpa
  // a cache desta execução, para as mensagens seguintes nem tentarem.
  if (result.failure.reason === "token_expired") {
    await markIntegrationExpired(credentials.integrationId);
    cache.set(`${row.workspaceId}|${row.platform}`, null);
  }

  const attempts = row.retryCount + 1;
  if (result.failure.kind === "transient" && attempts < MAX_ATTEMPTS) {
    await prisma.outboxMessage.update({
      where: { id: row.id },
      data: {
        status: "PENDING",
        retryCount: attempts,
        errorMessage: `${result.failure.reason}: ${result.detail}`.slice(0, 300),
        nextAttemptAt: new Date(Date.now() + backoffSeconds(attempts) * 1000),
      },
    });
    return "retried";
  }
  return markFailed(row, payload, result.failure.reason);
}

async function sendTemplateResult(
  credentials: Credentials,
  payload: Extract<OutboxPayload, { kind: "template" }>,
): Promise<MetaSendResult> {
  const sent = await sendTemplateToMeta(credentials, payload.to, payload.templateName, payload.language, payload.params);
  return sent.ok ? { ok: true, externalId: sent.data.externalId } : sent;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------------------------------- o lote
export async function processOutbox(options: ProcessOptions = {}): Promise<ProcessSummary> {
  const { limit = DEFAULT_LIMIT, concurrency = CONCURRENCY, deadlineAt } = options;
  const summary: ProcessSummary = { claimed: 0, sent: 0, retried: 0, failed: 0, deferred: 0 };

  await failStale();
  if (Math.random() < CLEANUP_PROBABILITY) {
    await prisma.outboxMessage
      .deleteMany({ where: { status: "SENT", updatedAt: { lt: new Date(Date.now() - SENT_RETENTION_MS) } } })
      .catch(() => {});
  }

  const rows = await claim(limit);
  summary.claimed = rows.length;
  if (rows.length === 0) return summary;

  // Série por destinatário (a ordem da conversa), paralelo entre destinatários.
  const groups = new Map<string, ClaimedRow[]>();
  for (const row of rows) {
    const payload = outboxPayloadSchema.safeParse(typeof row.payload === "string" ? safeJson(row.payload) : row.payload);
    const key = `${row.workspaceId}|${row.platform}|${payload.success ? payload.data.to : row.id}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const queue = [...groups.values()].map((group) =>
    group.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)),
  );

  const cache = new Map<string, Credentials | null>(); // só dura esta chamada
  const tally = (outcome: Outcome) => {
    summary[outcome === "sent" ? "sent" : outcome === "retried" ? "retried" : outcome === "failed" ? "failed" : "deferred"]++;
  };

  for (let i = 0; i < queue.length; i += concurrency) {
    const batch = queue.slice(i, i + concurrency);

    if (deadlineAt !== undefined && Date.now() >= deadlineAt) {
      await release(queue.slice(i).flatMap((group) => group.map((r) => r.id)));
      break;
    }

    const settled = await Promise.allSettled(
      batch.map(async (group) => {
        for (const [index, row] of group.entries()) {
          let outcome: Outcome;
          try {
            outcome = await processOne(row, cache);
          } catch (err) {
            // Erro nosso (base de dados...). Antes do envio a linha já voltou à fila; depois do envio fica
            // PROCESSING e a recuperação decide. O resto deste destinatário volta à fila: mantém a ordem.
            console.error("[outbox] falha ao processar", row.id, err);
            await release(group.slice(index + 1).map((r) => r.id)).catch(() => {});
            throw err;
          }
          tally(outcome);
          // Se esta ficou para trás (adiada ou à espera de nova tentativa), as seguintes do mesmo
          // destinatário esperam: não passam à frente.
          if (outcome === "retried" || outcome === "deferred") {
            await release(group.slice(index + 1).map((r) => r.id));
            break;
          }
        }
      }),
    );
    for (const result of settled) if (result.status === "rejected") summary.failed++;
  }
  return summary;
}

// Para quem enfileira (a IA, a Inbox): tenta enviar já, em vez de esperar pelo cron. Nunca lança, e dá
// pouco tempo a si própria para não estourar a duração máxima da função de quem a chamou.
export async function drainOutbox(budgetMs = 10_000) {
  try {
    return await processOutbox({ deadlineAt: Date.now() + budgetMs });
  } catch (err) {
    console.error("[outbox] drain falhou", err);
    return null;
  }
}
