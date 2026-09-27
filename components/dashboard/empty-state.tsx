export function DashboardEmptyState({ message }: { message: string }) {
  return (
    <div className="glow-border flex min-h-[16rem] flex-col items-center justify-center rounded-2xl px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-xl">
        {"\u{1F6A7}"}
      </span>
      <p className="mt-4 max-w-sm text-sm text-muted">{message}</p>
    </div>
  );
}
