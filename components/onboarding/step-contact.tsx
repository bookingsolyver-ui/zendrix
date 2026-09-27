const COUNTRY_CODES = [
  { value: "+244", label: "🇦🇴 +244" },
  { value: "+55", label: "🇧🇷 +55" },
  { value: "+351", label: "🇵🇹 +351" },
];

export function StepContact({
  firstName,
  countryCode,
  whatsapp,
  onFirstNameChange,
  onCountryCodeChange,
  onWhatsappChange,
}: {
  firstName: string;
  countryCode: string;
  whatsapp: string;
  onFirstNameChange: (value: string) => void;
  onCountryCodeChange: (value: string) => void;
  onWhatsappChange: (value: string) => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Como a gente fala com você?
      </h1>
      <p className="mt-2 text-sm text-muted">
        Vamos usar estes dados para configurar a sua conta e o seu primeiro canal.
      </p>

      <div className="glow-border mt-8 space-y-5 rounded-2xl p-6">
        <div>
          <label htmlFor="first-name" className="text-sm font-medium text-foreground">
            Primeiro nome
          </label>
          <input
            id="first-name"
            type="text"
            value={firstName}
            onChange={(event) => onFirstNameChange(event.target.value)}
            placeholder="Ex: Filipe"
            className="mt-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
          />
        </div>

        <div>
          <label htmlFor="whatsapp" className="text-sm font-medium text-foreground">
            Seu WhatsApp
          </label>
          <div className="mt-2 flex gap-2">
            <select
              value={countryCode}
              onChange={(event) => onCountryCodeChange(event.target.value)}
              aria-label="Indicativo do país"
              className="rounded-lg border border-border bg-surface-2 px-2.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            >
              {COUNTRY_CODES.map((code) => (
                <option key={code.value} value={code.value}>
                  {code.label}
                </option>
              ))}
            </select>
            <input
              id="whatsapp"
              type="tel"
              value={whatsapp}
              onChange={(event) => onWhatsappChange(event.target.value)}
              placeholder="923 456 789"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
