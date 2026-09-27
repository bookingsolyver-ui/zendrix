export function ToggleSwitch({
  checked,
  onChange,
  size = "md",
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  size?: "sm" | "md";
}) {
  const isMd = size === "md";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex shrink-0 items-center rounded-full p-0.5 transition-colors ${
        isMd ? "h-6 w-11" : "h-5 w-9"
      } ${checked ? "bg-emerald-500" : "bg-white/15"}`}
    >
      <span
        className={`rounded-full bg-white shadow transition-transform ${
          isMd ? "h-5 w-5" : "h-4 w-4"
        } ${checked ? (isMd ? "translate-x-5" : "translate-x-4") : "translate-x-0"}`}
      />
    </button>
  );
}
