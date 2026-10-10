import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SaaSErrorLogger } from "@/lib/superadmin/events";
import { dailyLimit, dayKey, isOverQuota, upsellText } from "@/lib/superadmin/quota-rules";

// TenantQuotaService: protege o nosso orçamento de IA. Cada organização tem N chamadas por dia (AI_CALLS_PER_DAY, 500 por omissão;
// limite próprio em KwanzaAdmin_QuotaOverride). O contador vive numa tabela leve, com incremento ATÓMICO (uma instrução SQL: dois
// pedidos simultâneos nunca leem o mesmo valor). Sem Redis: um contador por organização/dia é barato em Postgres e não obriga a
// nova infraestrutura; se o volume crescer, só `consume` muda.
//
// Ao passar o limite NÃO se rebenta a interface: `withAiQuota` devolve o texto de recurso (modelo estático) e avisa a equipa uma vez
// por organização e dia, com a sugestão de upsell. Falha ABERTA se a base de dados falhar (não se corta quem paga).

export interface QuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
}

export const TenantQuotaService = {
  async consume(workspaceId: string, metric = "ai_calls", now = new Date()): Promise<QuotaResult> {
    try {
      const day = dayKey(now);
      const [rows, override] = await Promise.all([
        prisma.$queryRaw<{ count: number }[]>`
          INSERT INTO "ZetrixAdmin_Usage" ("id", "workspaceId", "day", "metric", "count", "updatedAt")
          VALUES (${crypto.randomUUID()}::text, ${workspaceId}::text, ${day}::text, ${metric}::text, 1, now())
          ON CONFLICT ("workspaceId", "day", "metric") DO UPDATE SET "count" = "ZetrixAdmin_Usage"."count" + 1, "updatedAt" = now()
          RETURNING "count"`,
        prisma.kwanzaAdmin_QuotaOverride.findUnique({ where: { workspaceId_metric: { workspaceId, metric } }, select: { dailyLimit: true } }),
      ]);
      const used = Number(rows[0]?.count ?? 1);
      const limit = dailyLimit(override?.dailyLimit, process.env.AI_CALLS_PER_DAY);
      return { allowed: !isOverQuota(used, limit), used, limit };
    } catch (err) {
      console.error("[quota] falhou, a deixar passar", err instanceof Error ? err.message : err);
      return { allowed: true, used: 0, limit: dailyLimit(null, process.env.AI_CALLS_PER_DAY) };
    }
  },

  // Aviso (uma vez por organização e dia) à equipa, com a recomendação de upsell.
  async notifyExceeded(workspaceId: string, q: QuotaResult, now = new Date()) {
    const name = (await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }).catch(() => null))?.name ?? workspaceId;
    await SaaSErrorLogger.capture({ workspaceId, route: "quota/ai_calls", kind: "quota_exceeded", severity: "warning", message: upsellText(name, q.used, q.limit), alert: true, dedupeMs: 24 * 3_600_000, fingerprintKey: `${workspaceId}:${dayKey(now)}`, details: { used: q.used, limit: q.limit } });
  },
};

// Soft downgrade: gasta uma chamada de IA, ou — se a organização passou o limite — devolve `fallback()` (texto fixo) sem tocar no modelo.
//   const text = await withAiQuota(workspaceId, () => callLLM(...), () => "Texto fixo");
export async function withAiQuota<T>(workspaceId: string, run: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  const q = await TenantQuotaService.consume(workspaceId);
  if (q.allowed) return run();
  if (q.used === q.limit + 1) await TenantQuotaService.notifyExceeded(workspaceId, q); // só na primeira chamada acima do limite
  return fallback();
}

// Para rotas de API sem texto de recurso: o 429 clássico.
export const quotaExceededResponse = () => NextResponse.json({ success: false, error: "quota_exceeded" }, { status: 429, headers: { "Retry-After": "3600" } });
