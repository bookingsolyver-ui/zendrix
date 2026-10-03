// Glifos das plataformas da Meta que o Lucide não tem (as versões recentes removeram os ícones de marcas).
// O do WhatsApp está em whatsapp-glyph.tsx. Todos usam currentColor: a cor vem de quem os usa.

export function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5.2" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.4" cy="6.6" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Balão do Messenger com o raio recortado (fill-rule evenodd: o raio é um buraco no balão).
export function MessengerGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.15 7.16V22l3-1.65c.9.25 1.84.38 2.85.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2zM5.6 14.4l4.5-4.8 2.6 2.55 4.7-2.55-4.05 4.8-2.55-2.5-5.2 2.5z"
      />
    </svg>
  );
}
