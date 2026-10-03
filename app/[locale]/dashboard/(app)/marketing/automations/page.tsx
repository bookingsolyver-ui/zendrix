import { setRequestLocale } from "next-intl/server";
import { Clock, History, ShieldCheck, Workflow } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { MarketingHero } from "@/components/dashboard/marketing/hero-banner";
import { FeatureGrid } from "@/components/dashboard/crm/feature-grid";
import { AutomationsManager, type AutomationView, type RunView } from "@/components/dashboard/marketing/automations-manager";
import { getCurrentUser } from "@/lib/auth/current-user";
import { automationStats } from "@/lib/automations/engine";
import { ACTION_TYPES, parseActions, parseTriggerConfig, type ActionType } from "@/lib/automations/schema";
import { prisma } from "@/lib/prisma";

const FEATURES = [
  { icon: Clock, title: "Executam por si", description: "O sistema verifica os eventos de 5 em 5 minutos e executa as ações, sem ninguém ter de intervir." },
  { icon: ShieldCheck, title: "Sem repetições", description: "Cada evento só corre uma vez, e a mesma automação só corre uma vez por contacto em 24 horas." },
  { icon: Workflow, title: "Só o que acontece depois", description: "Ao ativar, a automação não age sobre contactos antigos: só sobre o que acontecer a partir desse momento." },
  { icon: History, title: "Tudo registado", description: "Cada execução fica guardada com o resultado de cada ação, incluindo as que foram ignoradas e porquê." },
];

const dateFormat = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" });

export default async function MarketingAutomationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const workspaceId = user?.workspace?.id;
  const canManage = user?.role === "OWNER" || user?.role === "MANAGER";

  const rows = workspaceId ? await prisma.automation.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } }) : [];
  const stats = workspaceId ? await automationStats(workspaceId, rows.map((row) => row.id)) : {};
  const automations: AutomationView[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    trigger: row.trigger,
    keyword: parseTriggerConfig(row.config).keyword,
    actions: parseActions(row.actions),
    active: row.active,
    runs: stats[row.id]?.runs ?? 0,
    messages: stats[row.id]?.messages ?? 0,
    failed: stats[row.id]?.failed ?? 0,
  }));

  const recent = workspaceId
    ? await prisma.automationRun.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { id: true, createdAt: true, completedAt: true, contactId: true, automation: { select: { name: true } }, steps: { orderBy: { index: "asc" }, select: { type: true, status: true, reason: true } } },
      })
    : [];
  const contacts = recent.length ? await prisma.contact.findMany({ where: { workspaceId, id: { in: recent.map((run) => run.contactId) } }, select: { id: true, name: true, waId: true } }) : [];
  const runs: RunView[] = recent.map((run) => {
    const contact = contacts.find((c) => c.id === run.contactId);
    const statuses = run.steps.map((step) => step.status);
    return {
      id: run.id,
      automationName: run.automation.name,
      contact: contact?.name?.trim() || (contact ? `+${contact.waId}` : "Contacto removido"),
      whenLabel: dateFormat.format(run.createdAt),
      status: !run.completedAt ? "Em curso" : statuses.includes("FAILED") ? "Falhou" : statuses.every((status) => status === "SKIPPED") ? "Ignorada" : "Concluída",
      steps: run.steps.filter((step): step is typeof step & { type: ActionType } => (ACTION_TYPES as readonly string[]).includes(step.type)).map((step) => ({ type: step.type, status: step.status, reason: step.reason })),
    };
  });

  return (
    <>
      <DashboardPageHeader title="Automações" subtitle="Automatize respostas e tarefas a partir de eventos reais do seu negócio." />
      <div className="space-y-8">
        <MarketingHero
          icon={Workflow}
          title="Fluxos automáticos"
          description="Escolha um evento (novo contacto, mensagem recebida, lead qualificado, pagamento) e o que deve acontecer a seguir: enviar uma mensagem, mudar a fase ou criar uma tarefa."
          bullets={["Gatilhos reais da sua base de contactos", "Mensagens pela fila de envio, com as regras do WhatsApp", "Histórico de cada execução"]}
        />
        <AutomationsManager automations={automations} runs={runs} canManage={canManage} />
        <FeatureGrid title="Como funciona" features={FEATURES} />
      </div>
    </>
  );
}
