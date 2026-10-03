import { PublicHeader } from "@/components/public-header";
import { SiteFooter } from "@/components/landing/site-footer";
import {
  LEGAL_UPDATED,
  legalDocument,
  legalEntityFromEnv,
  legalLang,
  type LegalKind,
} from "@/lib/legal/content";

// Página pública de um documento legal (Termos ou Privacidade). Texto em lib/legal/content.ts.
export function LegalPage({ kind, locale }: { kind: LegalKind; locale: string }) {
  const lang = legalLang(locale);
  const date = new Date(LEGAL_UPDATED).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const doc = legalDocument(kind, lang, legalEntityFromEnv(), date);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1 px-4 py-14 sm:px-6">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-white">{doc.title}</h1>
          <p className="mt-2 text-sm text-white/40">{doc.updatedLabel}</p>
          {locale === "es" && (
            <p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
              Este documento está disponible en español próximamente; mostramos la versión en inglés.
            </p>
          )}
          <p className="mt-8 text-white/70">{doc.intro}</p>

          {doc.sections.map((section) => (
            <section key={section.heading} className="mt-10">
              <h2 className="text-lg font-semibold text-white">{section.heading}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-white/60">
                {section.body.map((block, index) =>
                  Array.isArray(block) ? (
                    <ul key={index} className="list-disc space-y-2 pl-5">
                      {block.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={index}>{block}</p>
                  ),
                )}
              </div>
            </section>
          ))}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
