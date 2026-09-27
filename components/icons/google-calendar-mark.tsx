export function GoogleCalendarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="2" y="4" width="20" height="18" rx="3" fill="var(--surface-2)" stroke="var(--border)" />
      <rect x="2" y="4" width="20" height="5" rx="2" fill="#4285F4" />
      <rect x="5" y="1.5" width="2" height="5" rx="1" fill="#4285F4" />
      <rect x="17" y="1.5" width="2" height="5" rx="1" fill="#4285F4" />
      <rect x="6" y="12" width="4" height="4" rx="0.5" fill="#34A853" />
      <rect x="14" y="12" width="4" height="4" rx="0.5" fill="#FBBC05" />
      <rect x="6" y="17.5" width="4" height="3" rx="0.5" fill="#EA4335" />
    </svg>
  );
}
