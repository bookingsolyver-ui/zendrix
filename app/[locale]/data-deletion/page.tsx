import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PublicHeader } from "@/components/public-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { DeletionRequestForm } from "@/components/legal/deletion-request-form";
import { legalEntityFromEnv, legalLang } from "@/lib/legal/content";

export const metadata: Metadata = { title: "Data deletion · Kwanza Flow" };

const TEXT = {
  pt: {
    title: "Eliminação de dados",
    intro: "Pode pedir a eliminação dos seus dados da Kwanza Flow. Escolha o caminho que se aplica ao seu caso:",
    options: [
      ["Tenho conta e consigo entrar.", "Em Configurações → Perfil → Eliminar conta. É imediato: apaga a organização, os utilizadores, os canais, as conversas e os ficheiros, e cancela a subscrição. Só o Proprietário o pode fazer."],
      ["Liguei o Instagram ou o Messenger através do Facebook.", "Remova a aplicação Kwanza Flow nas definições do Facebook (Definições → Aplicações e sites). Apagamos automaticamente as ligações a canais feitas por si. Receberá um código de confirmação e pode ver o estado abaixo."],
      ["Não consigo entrar na conta, ou escrevi a uma empresa que usa a Kwanza Flow.", "Se não consegue entrar, peça abaixo. Se escreveu a uma empresa por WhatsApp, Instagram ou Messenger, dirija-se a essa empresa: é ela a responsável pelas suas mensagens."],
    ],
    formTitle: "Pedido de eliminação",
    formNote: "Depois de verificarmos que o e-mail é seu, apagamos os dados associados e respondemos em 30 dias.",
    contact: "Também pode escrever para",
    statusTitle: "Já fez um pedido?",
    statusLink: "Ver o estado com o código de confirmação",
    privacy: "Política de Privacidade",
  },
  en: {
    title: "Data deletion",
    intro: "You can request deletion of your data from Kwanza Flow. Pick the path that applies to you:",
    options: [
      ["I have an account and can sign in.", "Go to Settings → Profile → Delete account. It is immediate: it erases the organization, users, channels, conversations and files, and cancels the subscription. Only the Owner can do it."],
      ["I connected Instagram or Messenger through Facebook.", "Remove the Kwanza Flow app in your Facebook settings (Settings → Apps and websites). We automatically delete the channel connections made by you. You will get a confirmation code and can check the status below."],
      ["I can't sign in, or I wrote to a business that uses Kwanza Flow.", "If you can't sign in, submit a request below. If you wrote to a business via WhatsApp, Instagram or Messenger, contact that business: it is responsible for your messages."],
    ],
    formTitle: "Deletion request",
    formNote: "After we verify the email is yours, we delete the associated data and reply within 30 days.",
    contact: "You can also write to",
    statusTitle: "Already made a request?",
    statusLink: "Check the status with your confirmation code",
    privacy: "Privacy Policy",
  },
} as const;

export default async function DataDeletionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lang = legalLang(locale);
  const t = TEXT[lang];
  const { email } = legalEntityFromEnv();

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1 px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-white">{t.title}</h1>
          <p className="mt-4 text-white/70">{t.intro}</p>

          <ol className="mt-8 space-y-5">
            {t.options.map(([heading, body], index) => (
              <li key={heading} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="font-semibold text-white">
                  {index + 1}. {heading}
                </p>
                <p className="mt-1.5 text-sm text-white/60">{body}</p>
              </li>
            ))}
          </ol>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-white">{t.formTitle}</h2>
            <p className="mb-4 mt-1 text-sm text-white/50">{t.formNote}</p>
            <DeletionRequestForm lang={lang} />
            {email && (
              <p className="mt-4 text-sm text-white/50">
                {t.contact} <a href={`mailto:${email}`} className="underline">{email}</a>.
              </p>
            )}
          </section>

          <p className="mt-10 text-sm text-white/50">
            {t.statusTitle}{" "}
            <Link href="/data-deletion/status" className="underline">
              {t.statusLink}
            </Link>
            . · <Link href="/privacy" className="underline">{t.privacy}</Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
