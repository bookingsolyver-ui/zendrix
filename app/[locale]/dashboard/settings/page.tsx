import { setRequestLocale } from "next-intl/server";
import {
  BookOpen,
  CreditCard,
  MessageCircle,
  Rocket,
  Wallet,
  Repeat,
  CalendarClock,
  Share2,
  User,
  Users,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { DashboardPageHeader } from "@/components/dashboard/page-header";

const SETTINGS_LINKS = [
  {
    href: "/dashboard/settings/setup",
    icon: Rocket,
    title: "Primeiros passos",
    description: "Ligue um canal, preencha a ficha do negócio e ative a IA.",
  },
  {
    href: "/dashboard/settings/profile",
    icon: User,
    title: "Perfil",
    description: "Dados pessoais, fotografia e preferências de idioma.",
  },
  {
    href: "/dashboard/settings/business",
    icon: BookOpen,
    title: "Ficha do negócio",
    description:
      "O que o assistente de IA sabe sobre a sua empresa: produtos, preços e regras.",
  },
  {
    href: "/dashboard/settings/billing",
    icon: CreditCard,
    title: "Faturação e Subscrição",
    description: "Plano, limites de uso, método de pagamento e faturas.",
  },
  {
    href: "/dashboard/settings/whatsapp",
    icon: MessageCircle,
    title: "WhatsApp",
    description: "Ligue e gira os números de WhatsApp Business da sua conta.",
  },
  {
    href: "/dashboard/settings/sales",
    icon: Wallet,
    title: "Vendas e pagamentos",
    description: "Ligue o Stripe e defina o que a IA pode vender com um link de pagamento.",
  },
  {
    href: "/dashboard/settings/followups",
    icon: Repeat,
    title: "Reengajamento",
    description: "A IA retoma a conversa com quem deixou de responder, dentro das regras da Meta.",
  },
  {
    href: "/dashboard/settings/schedule",
    icon: CalendarClock,
    title: "Agenda",
    description: "Defina os horários em que a IA pode marcar reuniões.",
  },
  {
    href: "/dashboard/settings/channels",
    icon: Share2,
    title: "Canais",
    description: "Ligue o WhatsApp, o Instagram e o Messenger à sua conta.",
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
        subtitle="Gira as definições gerais da sua conta Zetrix."
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
