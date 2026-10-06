import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveFlag, type FlagRow } from "@/lib/superadmin/catalog";

// Feature flags por organização (a «torneira»). Uma consulta indexada por chamada, sem cache: desligar uma funcionalidade
// vale NA PRÓXIMA chamada, em todas as instâncias. Falha ABERTA (se a base de dados falhar, não se corta o serviço a quem paga):
// o erro fica nos registos.
export const TenantFlags = {
  async rows(workspaceId: string): Promise<FlagRow[]> {
    return prisma.zetrixAdmin_FeatureFlag.findMany({ where: { workspaceId }, select: { flag: true, enabled: true } });
  },

  async isEnabled(workspaceId: string, flag: string): Promise<boolean> {
    try {
      return resolveFlag(await prisma.zetrixAdmin_FeatureFlag.findMany({ where: { workspaceId, flag: { in: [flag, "*"] } }, select: { flag: true, enabled: true } }), flag);
    } catch (err) {
      console.error("[flags] falhou, a deixar passar", err instanceof Error ? err.message : err);
      return true;
    }
  },

  async set(workspaceId: string, flag: string, enabled: boolean, updatedBy: string, reason?: string) {
    return prisma.zetrixAdmin_FeatureFlag.upsert({ where: { workspaceId_flag: { workspaceId, flag } }, create: { workspaceId, flag, enabled, updatedBy, reason }, update: { enabled, updatedBy, reason } });
  },
};

// Para as rotas: devolve a resposta 403 se a funcionalidade está desligada para esta organização, ou null (pode seguir).
//   const off = await requireFeature(who.workspaceId, "ai_predictions"); if (off) return off;
export async function requireFeature(workspaceId: string, flag: string): Promise<NextResponse | null> {
  return (await TenantFlags.isEnabled(workspaceId, flag)) ? null : NextResponse.json({ success: false, error: "feature_disabled", feature: flag }, { status: 403 });
}
