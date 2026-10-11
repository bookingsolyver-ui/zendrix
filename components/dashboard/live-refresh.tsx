"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

// Mantém um ecrã de indicadores ao vivo sem Supabase Realtime (as tabelas não são legíveis pelo browser, de propósito).
// Faz poll a /api/pulse (uma consulta agregada, barata) e só quando a assinatura muda é que o servidor volta a calcular
// os cartões (router.refresh). Pausa com o separador escondido e recupera logo ao voltar. Em falhas seguidas abranda.
const FAST_MS = 5_000;
const SLOW_MS = 30_000;

export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last: string | null = null;
    let failures = 0;

    async function tick() {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch("/api/pulse", { cache: "no-store" });
          const data = res.ok ? await res.json().catch(() => null) : null;
          if (data?.sig) {
            failures = 0;
            if (last !== null && last !== data.sig) router.refresh();
            last = data.sig;
          } else {
            failures++;
          }
        } catch {
          failures++;
        }
      }
      if (!stopped) timer = setTimeout(tick, failures >= 3 ? SLOW_MS : FAST_MS);
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        void tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
