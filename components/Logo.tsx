import { Link } from "@/i18n/navigation";

export function Logo({
  href = "/",
  size = "md",
  className = "",
}: {
  href?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const mark = size === "sm" ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm";
  const wordmark = size === "sm" ? "text-base" : "text-lg";

  return (
    <Link href={href} className={`group flex items-center gap-2 ${className}`}>
      <span
        className={`flex ${mark} items-center justify-center rounded-lg border border-border bg-surface-2 font-bold transition-colors group-hover:border-neon-green/60`}
      >
        <span className="neon-green-text">Z</span>
      </span>
      <span className={`${wordmark} font-semibold tracking-tight text-foreground`}>
        Zet<span className="neon-green-text">rix</span>
      </span>
    </Link>
  );
}
