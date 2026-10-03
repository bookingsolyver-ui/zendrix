export function AvatarSection({ initials, name, email }: { initials: string; name: string | null; email: string }) {
  return (
    <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-6">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-2 text-xl font-semibold text-background">
        {initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{name || email.split("@")[0]}</p>
        <p className="mt-0.5 truncate text-xs text-white/40">{email}</p>
      </div>
    </div>
  );
}
