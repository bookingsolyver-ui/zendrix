import { Link } from "@/i18n/navigation";

export default function LocaleNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <p className="text-sm font-medium text-muted">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted">
          A página que procura não existe ou foi movida.
        </p>
        <Link
          href="/"
          className="neon-btn mt-6 inline-block rounded-full px-6 py-3 text-sm font-semibold text-background"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
