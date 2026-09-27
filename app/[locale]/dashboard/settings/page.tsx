import { setRequestLocale } from "next-intl/server";
import { CreditCard, MessageCircle, Plug, Users, Webhook } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";

const SETTINGS_LINKS = [
  {
    href: "/dashboard/settings/billing",
    icon: CreditCard,
    title: "Cobrança",
    description: "Plano, ciclo de faturação, moeda e histórico de pagamentos.",
  },
  {
    href: "/dashboard/settings/whatsapp",
    icon: MessageCircle,
    title: "WhatsApp",
    description: "Ligue e gira os números de WhatsApp Business da sua conta.",
  },
  {
    href: "/dashboard/integrations",
    icon: Plug,
    title: "Integrações",
    description: "Ligue a Zentrix às ferramentas que já utiliza.",
  },
  {
    href: "/dashboard/settings/webhooks",
    icon: Webhook,
    title: "Webhooks",
    description: "Configure endpoints para receber eventos em tempo real.",
  },
  {
    href: "/dashboard/settings/team",
    icon: Users,
    title: "Equipa e Permissões",
    description: "Convide colegas e defina o papel de cada membro da equipa.",
  },
] as const;

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <DashboardPageHeader
        title="Configurações"
        subtitle="Gira as definições gerais da sua conta Zentrix."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_LINKS.map((link) => {
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className="glow-border group rounded-2xl p-6 transition-colors hover:border-primary"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2">
                <Icon className="h-5 w-5 text-muted transition-colors group-hover:text-neon-green" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{link.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{link.description}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
