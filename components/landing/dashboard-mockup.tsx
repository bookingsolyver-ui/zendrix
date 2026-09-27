const SIDEBAR_ITEMS = [70, 45, 60, 50, 65, 40, 55];

export function DashboardMockup() {
  return (
    <div className="relative mx-auto mt-16 max-w-5xl px-4 sm:mt-20 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-10 -bottom-10 h-40 rounded-full bg-green-500/10 blur-3xl"
      />

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-surface to-background shadow-2xl shadow-black/60">
        <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        </div>

        <div className="grid grid-cols-[64px_1fr] sm:grid-cols-[190px_1fr]">
          <div className="space-y-2.5 border-r border-white/5 p-4">
            {SIDEBAR_ITEMS.map((width, index) => (
              <div
                key={index}
                style={{ width: `${width}%` }}
                className={`h-2.5 rounded-full ${index === 0 ? "bg-green-500/50" : "bg-white/[0.06]"}`}
              />
            ))}
          </div>

          <div className="space-y-4 p-5 sm:p-8">
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:p-4"
                >
                  <div className="h-2 w-1/2 rounded-full bg-white/10" />
                  <div className="h-4 w-2/3 rounded-full bg-white/20" />
                </div>
              ))}
            </div>

            <div className="flex h-32 items-end gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:h-40">
              {[35, 55, 45, 70, 60, 85, 75, 95, 80, 100].map((height, index) => (
                <div
                  key={index}
                  style={{ height: `${height}%` }}
                  className="flex-1 rounded-t-sm bg-gradient-to-t from-green-500/60 to-green-300/40"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
