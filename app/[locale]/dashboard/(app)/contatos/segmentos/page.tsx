import { setRequestLocale } from "next-intl/server";
import { Info } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type Segment = { name: string; type: "Lista" | "Dinâmico"; description: string; where: Prisma.ContactWhereInput };

// Segmentos que existem hoje: definidos a partir dos dados reais dos contactos, atualizados sozinhos.
function buildSegments(): Segment[] {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return [
    { name: "Todos os contactos", type: "Lista", description: "A lista padrão, com todas as pessoas que já falaram consigo.", where: {} },
    { name: "Novos (últimos 7 dias)", type: "Dinâmico", description: "Contactos criados nos últimos 7 dias.", where: { createdAt: { gte: weekAgo } } },
    { name: "Em conversa", type: "Dinâmico", description: "Responderam e estão a ser acompanhados.", where: { leadStage: "ENGAGED" } },
    { name: "Qualificados", type: "Dinâmico", description: "Têm interesse real e dados de contacto confirmados.", where: { leadStage: "QUALIFIED" } },
    { name: "Pagamento enviado", type: "Dinâmico", description: "Receberam um link de pagamento que ainda não foi pago.", where: { leadStage: "PAYMENT_SENT" } },
    { name: "Clientes", type: "Dinâmico", description: "Pagamento confirmado.", where: { leadStage: "WON" } },
    { name: "Sem mensagens automáticas", type: "Dinâmico", description: "Pediram para não receber mais mensagens automáticas.", where: { optedOutAt: { not: null } } },
  ];
}

export default async function ContactsSegmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const workspaceId = user?.workspace?.id;
  const segments = buildSegments();
  const counts = workspaceId
    ? await Promise.all(segments.map((segment) => prisma.contact.count({ where: { workspaceId, ...segment.where } })))
    : segments.map(() => 0);

  return (
    <>
      <DashboardPageHeader
        title="Listas e segmentos"
        subtitle="Agrupe os contactos por fase e perfil para direcionar os seus envios."
      />

      <div className="glow-border overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Descrição</th>
              <th className="px-5 py-3 text-right font-medium">Membros</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((segment, index) => (
              <tr key={segment.name} className="border-b border-border last:border-b-0 hover:bg-surface-2/40">
                <td className="px-5 py-4 font-medium text-foreground">{segment.name}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">{segment.type}</span>
                </td>
                <td className="px-5 py-4 text-muted">{segment.description}</td>
                <td className="px-5 py-4 text-right font-medium text-foreground">{counts[index].toLocaleString("pt-PT")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 flex items-start gap-2 text-sm text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Os segmentos atualizam-se sozinhos à medida que os contactos mudam de fase. A criação de segmentos personalizados
        e a importação de listas ainda não estão disponíveis.
      </p>
    </>
  );
}
