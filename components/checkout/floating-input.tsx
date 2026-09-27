export function FloatingInput({
  id,
  label,
  type = "text",
  autoComplete,
  inputMode,
  maxLength,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "decimal";
  maxLength?: number;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        name={id}
        type={type}
        placeholder=" "
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        className="peer w-full rounded-xl border border-neutral-300 bg-white px-4 pb-2 pt-5 text-sm text-neutral-900 outline-none transition-colors focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400 transition-all peer-focus:top-3.5 peer-focus:text-xs peer-focus:text-emerald-600 peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-neutral-500"
      >
        {label}
      </label>
    </div>
  );
}
