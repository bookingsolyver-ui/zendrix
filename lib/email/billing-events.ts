import "server-only";
import { notify, ownerRecipients } from "@/lib/email/notify";
import { appBaseUrl } from "@/lib/http/public-url";
import { prisma } from "@/lib/prisma";

// «Subscrição renovada com sucesso»: depois de um evento do Stripe (verificado) que avança o período pago. Um
// e-mail por renovação (a chave é o novo fim do período) a cada proprietário, na sua língua. Nunca lança.
export async function notifyRenewal(workspaceId: string, periodEnd: Date, plan: string | null): Promise<void> {
  try {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
    if (!workspace) return;
    const priceLabel = process.env.NEXT_PUBLIC_PLAN_PRICE_LABEL?.trim() || null;
    for (const recipient of await ownerRecipients(workspaceId)) {
      const lang = recipient.locale === "en" || recipient.locale === "es" ? recipient.locale : "pt";
      await notify({
        kind: "subscription_renewed",
        dedupeKey: `renewal:${periodEnd.toISOString()}`,
        to: recipient.email,
        locale: recipient.locale,
        workspaceId,
        payload: { name: recipient.name, orgName: workspace.name, plan, renewedUntil: periodEnd.toISOString(), priceLabel, billingUrl: `${appBaseUrl()}/${lang}/dashboard/settings/billing` },
      });
    }
  } catch (err) {
    console.error("[email] renovação: falhou", workspaceId, err);
  }
}
