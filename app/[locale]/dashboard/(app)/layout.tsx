import { setRequestLocale } from "next-intl/server";
import { requireActivePlanForPage } from "@/lib/billing/access";

// PAYWALL das páginas do produto (Dashboard, Inbox, contactos, CRM, marketing...). Tudo o que está neste grupo
// exige um plano ativo; /dashboard/settings/* (faturação, canais, perfil...) fica FORA, sempre aberto, para
// quem não tem plano poder pagar. O grupo "(app)" não aparece no URL: os endereços não mudaram.
//
// Um layout não volta a correr ao navegar entre páginas do mesmo grupo: por isso as páginas mais sensíveis
// (Dashboard e Inbox) repetem a verificação, e todas as rotas de API recusam com 402 sem plano.
export default async function ProtectedProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireActivePlanForPage(locale);
  return children;
}
