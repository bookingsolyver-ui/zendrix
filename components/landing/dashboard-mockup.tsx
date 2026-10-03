import { useTranslations } from "next-intl";
import { CheckCheck, Inbox, KanbanSquare, Megaphone, Users, Workflow } from "lucide-react";

// Ilustração do painel: dados de exemplo, claramente marcados como tal. Server Component: os ícones são usados
// aqui mesmo, nunca passados a um Client Component.
export function DashboardMockup() {
  const t = useTranslations("Landing.mock");

  const nav = [
    { icon: Inbox, label: t("navInbox"), active: false },
    { icon: KanbanSquare, label: t("navCrm"), active: true },
    { icon: Megaphone, label: t("navCampaigns"), active: false },
    { icon: Workflow, label: t("navAutomations"), active: false },
    { icon: Users, label: t("navContacts"), active: false },
  ];
  const columns = [
    { title: t("colTodo"), tasks: [t("task1"), t("task2")], tone: "text-sky-300" },
    { title: t("colDoing"), tasks: [t("task3")], tone: "text-amber-300" },
    { title: t("colDone"), tasks: [], tone: "text-emerald-300" },
  ];
  const stats = [
    { label: t("sent"), value: "248" },
    { label: t("delivered"), value: "244" },
    { label: t("read"), value: "187" },
  ];

  return (
    <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] shadow-2xl shadow-emerald-500/10">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-3 text-xs text-white/40">{t("window")}</span>
        <span className="ml-auto rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">{t("sample")}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[11rem_1fr]">
        <aside className="hidden border-r border-white/10 p-3 md:block">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm ${item.active ? "bg-white/[0.07] text-foreground" : "text-white/45"}`}>
                <Icon className={`h-4 w-4 ${item.active ? "text-emerald-400" : ""}`} />
                {item.label}
              </div>
            );
          })}
        </aside>

        <div className="space-y-5 p-4 sm:p-6">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">{t("boardTitle")}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {columns.map((column) => (
                <div key={column.title} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className={`mb-2 text-xs font-semibold ${column.tone}`}>
                    {column.title} <span className="ml-1 text-white/30">{column.tasks.length}</span>
                  </p>
                  <div className="space-y-2">
                    {column.tasks.map((task) => (
                      <div key={task} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-snug text-white/80">
                        {task}
                      </div>
                    ))}
                    {column.tasks.length === 0 && <div className="h-9 rounded-xl border border-dashed border-white/10" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Megaphone className="h-3.5 w-3.5 text-emerald-400" />
                  {t("campaign")}: {t("campaignName")}
                </p>
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">{t("campaignStatus")}</span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <dt className="text-[10px] text-white/40">{stat.label}</dt>
                    <dd className="text-base font-semibold text-foreground">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Workflow className="h-3.5 w-3.5 text-emerald-400" />
                  {t("automation")}
                </p>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  <CheckCheck className="h-3 w-3" />
                  {t("automationActive")}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/60">{t("automationFlow")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
