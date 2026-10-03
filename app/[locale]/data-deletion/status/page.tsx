import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PublicHeader } from "@/components/public-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { legalLang } from "@/lib/legal/content";
import { prisma } from "@/lib/prisma";
import { deletionCodeSchema } from "@/lib/validations/data-deletion";

export const metadata: Metadata = { title: "Deletion request status · Zentrix", robots: { index: false } };

const TEXT = {
  pt: {
    title: "Estado do pedido de eliminação",
    label: "Código de confirmação",
    check: "Consultar",
    notFound: "Não encontrámos nenhum pedido com este código.",
    completed: "Concluído",
    received: "Recebido: a aguardar verificação e tratamento (até 30 dias)",
    back: "Voltar à eliminação de dados",
    requestedOn: "Pedido em",
    detail: "Detalhe",
  },
  en: {
    title: "Deletion request status",
    label: "Confirmation code",
    check: "Check",
    notFound: "We couldn't find a request with this code.",
    completed: "Completed",
    received: "Received: awaiting verification and processing (up to 30 days)",
    back: "Back to data deletion",
    requestedOn: "Requested on",
    detail: "Detail",
  },
} as const;

export default async function DeletionStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = TEXT[legalLang(locale)];
  const { code } = await searchParams;

  const parsed = deletionCodeSchema.safeParse(code);
  // Só se mostra o estado e o que foi apagado, nunca o e-mail nem outros dados de quem pediu.
  const request = parsed.success
    ? await prisma.dataDeletionRequest.findUnique({
        where: { code: parsed.data },
        select: { status: true, createdAt: true, detail: true },
      })
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1 px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-xl">
          <h1 className="text-3xl font-semibold tracking-tight text-white">{t.title}</h1>

          <form method="get" className="mt-8 flex gap-2">
            <label htmlFor="code" className="sr-only">
              {t.label}
            </label>
            <input
              id="code"
              name="code"
              defaultValue={code ?? ""}
              placeholder={t.label}
              maxLength={12}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white outline-none focus:border-emerald-500/50"
            />
            <button type="submit" className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">
              {t.check}
            </button>
          </form>

          {code && !request && <p role="alert" className="mt-6 text-sm text-red-400">{t.notFound}</p>}
          {request && (
            <dl className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm">
              <div>
                <dt className="text-white/40">Status</dt>
                <dd className={request.status === "completed" ? "font-semibold text-emerald-300" : "font-semibold text-amber-200"}>
                  {request.status === "completed" ? t.completed : t.received}
                </dd>
              </div>
              <div>
                <dt className="text-white/40">{t.requestedOn}</dt>
                <dd className="text-white/80">{request.createdAt.toLocaleDateString(locale === "pt" ? "pt-PT" : "en-GB")}</dd>
              </div>
              {request.detail && (
                <div>
                  <dt className="text-white/40">{t.detail}</dt>
                  <dd className="text-white/80">{request.detail}</dd>
                </div>
              )}
            </dl>
          )}

          <p className="mt-8 text-sm">
            <Link href="/data-deletion" className="text-white/50 underline">
              {t.back}
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
