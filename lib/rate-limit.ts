import "server-only";
import { prisma } from "@/lib/prisma";

// Limitador de pedidos de janela fixa, guardado na base de dados (tabela RateLimitBucket).
//
// Em serverless (Vercel) cada instância tem a sua memória e as instâncias vão e vêm: um contador em memória
// deixava passar N pedidos por instância. Aqui o contador é partilhado por todas, e a contagem é UMA
// instrução atómica (INSERT ... ON CONFLICT DO UPDATE): dois pedidos simultâneos nunca leem o mesmo valor.
// O relógio é o da base de dados, para as instâncias não discordarem sobre quando a janela acaba.

interface RateLimitOptions {
  limit: number;
  windowMs: number;
  // O que fazer se a base de dados falhar. Por omissão deixa passar (uma falha do limitador não deve
  // deitar abaixo a app); em rotas sensíveis (registo) fecha, para o limite não se contornar à força.
  failClosed?: boolean;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

// Linhas expiradas são apagadas de vez em quando, na própria chamada: não exige cron.
const CLEANUP_PROBABILITY = 1 / 200;
const CLEANUP_GRACE_MS = 60 * 60 * 1000;

export async function rateLimit(
  key: string,
  { limit, windowMs, failClosed = false }: RateLimitOptions,
): Promise<RateLimitResult> {
  const windowSeconds = windowMs / 1000;
  try {
    const rows = await prisma.$queryRaw<{ count: number; retry: number }[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
      VALUES (
        ${key}::text,
        1,
        timezone('utc', now()) + make_interval(secs => ${windowSeconds}::float8)
      )
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimitBucket"."resetAt" <= timezone('utc', now()) THEN 1
          ELSE "RateLimitBucket"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitBucket"."resetAt" <= timezone('utc', now())
            THEN timezone('utc', now()) + make_interval(secs => ${windowSeconds}::float8)
          ELSE "RateLimitBucket"."resetAt"
        END
      RETURNING
        "count",
        CEIL(GREATEST(EXTRACT(EPOCH FROM ("resetAt" - timezone('utc', now()))), 0))::int AS "retry"
    `;

    if (Math.random() < CLEANUP_PROBABILITY) {
      void prisma.rateLimitBucket
        .deleteMany({ where: { resetAt: { lt: new Date(Date.now() - CLEANUP_GRACE_MS) } } })
        .catch(() => {});
    }

    const row = rows[0];
    if (!row) return { ok: !failClosed, retryAfterSeconds: 0 };
    return row.count <= limit
      ? { ok: true, retryAfterSeconds: 0 }
      : { ok: false, retryAfterSeconds: Math.max(1, Number(row.retry)) };
  } catch (err) {
    console.error("[rate-limit] falhou, a", failClosed ? "recusar" : "deixar passar", err);
    return failClosed
      ? { ok: false, retryAfterSeconds: Math.ceil(windowSeconds) }
      : { ok: true, retryAfterSeconds: 0 };
  }
}

// Behind a trusted proxy/CDN (Vercel, Cloudflare) the first x-forwarded-for entry is the client.
// Without one (local dev) every request shares the "unknown" bucket.
export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}
