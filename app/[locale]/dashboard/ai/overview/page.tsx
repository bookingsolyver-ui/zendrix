import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { AiSummaryCards } from "@/components/dashboard/ai/overview/summary-cards";
import {
  RecentConversations,
  type RecentConversation,
} from "@/components/dashboard/ai/overview/recent-conversations";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { contactLabel } from "@/lib/inbox/display";

export default async function AiOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const workspaceId = user?.workspace?.id;

  // "Attended" = conversations we have actually replied to.
  const attended = workspaceId
    ? await prisma.conversation.count({
        where: { workspaceId, messages: { some: { direction: "OUT" } } },
      })
    : 0;

  const rows = workspaceId
    ? await prisma.conversation.findMany({
        where: { workspaceId },
        orderBy: { lastMessageAt: "desc" },
        take: 5,
        select: {
          id: true,
          lastMessagePreview: true,
          contact: { select: { name: true, waId: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 8,
            select: { direction: true, body: true },
          },
        },
      })
    : [];

  const conversations: RecentConversation[] = rows.map((row) => ({
    id: row.id,
    customer: contactLabel(row.contact.name, row.contact.waId),
    summary: row.lastMessagePreview ?? "Sem mensagens.",
    transcript: [...row.messages]
      .reverse()
      .map((m) => `${m.direction === "IN" ? "Cliente" : "Resposta"}: ${m.body}`),
  }));

  return (
    <>
      <DashboardPageHeader
        title="Desempenho do Assistente IA"
        subtitle="Acompanhe como o seu assistente de IA está a atender os seus clientes."
      />

      <div className="space-y-6">
        <AiSummaryCards attended={attended} />
        <RecentConversations conversations={conversations} />
      </div>
    </>
  );
}
