"use client";

import { useEffect, useState, type ButtonHTMLAttributes } from "react";
import { useTranslations } from "next-intl";

// A button for a feature that is not built yet. Instead of a silent dead click it tells the
// user so, through one toast shared by the whole app (<SoonToaster /> is mounted once in the
// locale layout).

type Listener = (feature: string) => void;
const listeners = new Set<Listener>();

function announce(feature: string) {
  listeners.forEach((listener) => listener(feature));
}

export function notifySoon(feature: string) {
  announce(feature);
}

export function SoonButton({
  feature,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { feature: string }) {
  return (
    <button
      type="button"
      {...props}
      onClick={(event) => {
        onClick?.(event);
        announce(feature);
      }}
    />
  );
}

export function SoonToaster() {
  const t = useTranslations("Common");
  const [feature, setFeature] = useState<string | null>(null);

  useEffect(() => {
    const listener: Listener = (name) => setFeature(name);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!feature) return;
    const timer = setTimeout(() => setFeature(null), 3500);
    return () => clearTimeout(timer);
  }, [feature]);

  if (!feature) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-[100] max-w-[90vw] -translate-x-1/2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground shadow-2xl"
    >
      {t("comingSoon", { feature })}
    </div>
  );
}
