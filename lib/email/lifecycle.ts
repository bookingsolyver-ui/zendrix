import "server-only";
import { endingDedupeKey, ENDING_SOON_DAYS, DAY_MS } from "@/lib/email/notifications";
import { ownerRecipients, queueNotification } from "@/lib/email/notify";
import { appBaseUrl } from "@/lib/http/public-url";
import { prisma } from "@/lib/prisma";

export interface LifecycleSummary {
  organizations: number;
  queued: number;
}

// Procura as organizações cujo teste ou subscrição termina nos próximos 5 dias e regista UM aviso a cada
// proprietário (a chave é o dia do fim: repetir a procura, ou correr dois workers, nunca duplica o e-mail).
// Só organizações aprovadas e não suspensas: a uma conta por aprovar ou bloqueada não se escreve.
export async function scanEndingSoon(now = new Date()): Promise<LifecycleSummary> {
  const limit = new Date(now.getTime() + ENDING_SOON_DAYS * DAY_MS);
  const base = { approvalStatus: "APPROVED" as const, blockedAt: null };
  const [trials, subscriptions] = await Promise.all([
    prisma.workspace.findMany({ where: { ...base, subStatus: "trialing", trialEndsAt: { gt: now, lte: limit } }, take: 200, select: { id: true, name: true, trialEndsAt: true } }),
    prisma.workspace.findMany({ where: { ...base, subStatus: "active", cancelAtPeriodEnd: true, periodEnd: { gt: now, lte: limit } }, take: 200, select: { id: true, name: true, periodEnd: true } }),
  ]);

  const summary: LifecycleSummary = { organizations: trials.length + subscriptions.length, queued: 0 };
  const billingUrl = (locale: string | null) => `${appBaseUrl()}/${locale === "en" || locale === "es" ? locale : "pt"}/dashboard/settings/billing`;
  const queue = async (workspace: { id: string; name: string }, kind: "trial" | "subscription", endsAt: Date) => {
    for (const recipient of await ownerRecipients(workspace.id)) {
      const id = await queueNotification({
        kind: "ending_soon",
        dedupeKey: endingDedupeKey(kind, endsAt),
        to: recipient.email,
        locale: recipient.locale,
        workspaceId: workspace.id,
        payload: { name: recipient.name, orgName: workspace.name, kind, endsAt: endsAt.toISOString(), billingUrl: billingUrl(recipient.locale) },
      });
      if (id) summary.queued++;
    }
  };
  for (const workspace of trials) if (workspace.trialEndsAt) await queue(workspace, "trial", workspace.trialEndsAt);
  for (const workspace of subscriptions) if (workspace.periodEnd) await queue(workspace, "subscription", workspace.periodEnd);
  return summary;
}
