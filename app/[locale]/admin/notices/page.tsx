import { setRequestLocale } from "next-intl/server";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { NoticeComposer } from "@/components/admin/notice-composer";
import { Pill, Section, Stat, TABLE, TD, TH, dateTime } from "@/components/admin/ui";
import { MAX_ATTEMPTS } from "@/lib/email/notify";
import { maskEmail, NOTICE_AUDIENCE_LABEL } from "@/lib/email/notice-schema";
import { emailConfigured } from "@/lib/email/send";
import { prisma } from "@/lib/prisma";

const KIND_LABEL: Record<string, string> = { pending_review: "Conta em análise", account_approved: "Conta aprovada", account_rejected: "Conta não aprovada", ending_soon: "Fim de teste/subscrição", subscription_renewed: "Subscrição renovada", system_notice: "Aviso do sistema" };
const nowDate = () => new Date();

export default async function AdminNoticesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const since = new Date(nowDate().getTime() - 7 * 86_400_000);

  const [byStatus, byKind, notices, noticeStats, problems] = await Promise.all([
    prisma.emailNotification.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.emailNotification.groupBy({ by: ["kind", "status"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.systemNotice.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.emailNotification.groupBy({ by: ["noticeId", "status"], where: { noticeId: { not: null } }, _count: { _all: true } }),
    prisma.emailNotification.findMany({ where: { OR: [{ status: "FAILED" }, { status: "PENDING", attempts: { gt: 0 } }] }, orderBy: { createdAt: "desc" }, take: 15, select: { id: true, kind: true, toEmail: true, status: true, attempts: true, lastError: true, createdAt: true } }),
  ]);
  const count = (status: string) => byStatus.find((row) => row.status === status)?._count._all ?? 0;
  const ready = emailConfigured();

  return (
    <>
      <DashboardPageHeader title="E-mails e avisos" subtitle="Envie avisos aos clientes (manutenção, novidades) e acompanhe todos os e-mails de notificação." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Resend" value={ready ? "Configurado" : "Em falta"} tone={ready ? "good" : "bad"} hint="RESEND_API_KEY e EMAIL_FROM" />
        <Stat label="Enviados (7 dias)" value={count("SENT").toLocaleString("pt-PT")} tone="good" />
        <Stat label="Pendentes" value={count("PENDING").toLocaleString("pt-PT")} tone={count("PENDING") > 0 ? "warn" : "default"} hint="O cron envia-os de 5 em 5 minutos" />
        <Stat label="Falhados (7 dias)" value={count("FAILED").toLocaleString("pt-PT")} tone={count("FAILED") > 0 ? "bad" : "default"} hint={`Depois de ${MAX_ATTEMPTS} tentativas`} />
      </div>

      <Section title="Novo aviso do sistema">
        <NoticeComposer emailReady={ready} />
      </Section>

      <Section title="Avisos enviados">
        <div className="glow-border overflow-x-auto rounded-2xl">
          <table className={TABLE}>
            <thead>
              <tr className="border-b border-white/10">
                <th className={TH}>Quando</th>
                <th className={TH}>Tipo</th>
                <th className={TH}>Assunto (PT)</th>
                <th className={TH}>Público</th>
                <th className={`${TH} text-right`}>Enviados</th>
                <th className={`${TH} text-right`}>Pendentes</th>
                <th className={`${TH} text-right`}>Falhados</th>
              </tr>
            </thead>
            <tbody>
              {notices.map((notice) => {
                const n = (status: string) => noticeStats.find((row) => row.noticeId === notice.id && row.status === status)?._count._all ?? 0;
                const subject = (notice.content as { pt?: { subject?: string } }).pt?.subject ?? "—";
                return (
                  <tr key={notice.id} className="border-b border-white/5 last:border-b-0">
                    <td className={`${TD} whitespace-nowrap text-white/60`}>{dateTime.format(notice.createdAt)}</td>
                    <td className={TD}>
                      <Pill>{notice.kind === "maintenance" ? "Manutenção" : "Aviso"}</Pill>
                    </td>
                    <td className={TD}>{subject}</td>
                    <td className={`${TD} text-white/60`}>{NOTICE_AUDIENCE_LABEL[notice.audience as keyof typeof NOTICE_AUDIENCE_LABEL] ?? notice.audience}</td>
                    <td className={`${TD} text-right text-emerald-300`}>
                      {n("SENT")} / {notice.totalRecipients}
                    </td>
                    <td className={`${TD} text-right`}>{n("PENDING")}</td>
                    <td className={`${TD} text-right ${n("FAILED") > 0 ? "text-red-300" : ""}`}>{n("FAILED")}</td>
                  </tr>
                );
              })}
              {notices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                    Ainda não enviou avisos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="E-mails automáticos (7 dias)">
        <div className="glow-border overflow-x-auto rounded-2xl">
          <table className={TABLE}>
            <thead>
              <tr className="border-b border-white/10">
                <th className={TH}>E-mail</th>
                <th className={`${TH} text-right`}>Enviados</th>
                <th className={`${TH} text-right`}>Pendentes</th>
                <th className={`${TH} text-right`}>Falhados</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(KIND_LABEL).map((kind) => {
                const n = (status: string) => byKind.find((row) => row.kind === kind && row.status === status)?._count._all ?? 0;
                return (
                  <tr key={kind} className="border-b border-white/5 last:border-b-0">
                    <td className={TD}>{KIND_LABEL[kind]}</td>
                    <td className={`${TD} text-right`}>{n("SENT")}</td>
                    <td className={`${TD} text-right`}>{n("PENDING")}</td>
                    <td className={`${TD} text-right ${n("FAILED") > 0 ? "text-red-300" : ""}`}>{n("FAILED")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Envios com problemas">
        <ul className="glow-border divide-y divide-white/5 rounded-2xl text-sm">
          {problems.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <span className="text-white/70">
                {KIND_LABEL[row.kind] ?? row.kind} · <span className="font-mono text-xs text-white/50">{maskEmail(row.toEmail)}</span>
                {row.lastError && <span className="ml-2 text-xs text-red-300/80">{row.lastError}</span>}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-white/40">{row.attempts} tentativa(s)</span>
                <Pill tone={row.status === "FAILED" ? "bad" : "warn"}>{row.status === "FAILED" ? "Falhou" : "A repetir"}</Pill>
                <span className="text-xs text-white/40">{dateTime.format(row.createdAt)}</span>
              </span>
            </li>
          ))}
          {problems.length === 0 && <li className="px-5 py-8 text-center text-white/40">Nenhum envio com problemas.</li>}
        </ul>
        <p className="mt-3 text-xs text-white/40">Os envios falhados repetem-se sozinhos (até {MAX_ATTEMPTS} tentativas). Um e-mail que falha nunca interrompe o registo, a aprovação nem o Stripe.</p>
      </Section>
    </>
  );
}
