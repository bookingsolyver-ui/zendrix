"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

// Botões da página «a aguardar aprovação». Só recebe texto: nada de funções vindas do servidor.
export function PendingActions({ checkLabel, logoutLabel }: { checkLabel: string; logoutLabel: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"check" | "logout" | null>(null);

  async function logout() {
    setBusy("logout");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => {
          setBusy("check");
          router.refresh();
          setTimeout(() => setBusy(null), 1200);
        }}
        className="neon-btn flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
      >
        {busy === "check" && <Loader2 className="h-4 w-4 animate-spin" />}
        {checkLabel}
      </button>
      <button type="button" disabled={busy !== null} onClick={() => void logout()} className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/30 disabled:opacity-60">
        {logoutLabel}
      </button>
    </div>
  );
}
