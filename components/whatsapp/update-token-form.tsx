"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

const ERRORS: Record<string, string> = {
  invalid_format: "O token parece incompleto ou tem espaços. Cole-o exatamente como a Meta o mostra.",
  invalid_token: "A Meta rejeitou este token. Confirme que copiou o token novo e completo.",
  rate_limited: "Demasiadas tentativas. Aguarde um pouco e tente novamente.",
  no_integration: "Não há nenhum número de WhatsApp ligado a este workspace.",
};

export function UpdateTokenForm() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || !token.trim()) return;
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/whatsapp/token", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setFeedback({
          ok: false,
          text: ERRORS[data?.error] ?? "Não foi possível atualizar o token. Tente novamente.",
        });
        return;
      }

      setToken("");
      setFeedback({ ok: true, text: "Token atualizado e validado com a Meta." });
      router.refresh();
    } catch {
      setFeedback({ ok: false, text: "Não foi possível atualizar o token. Tente novamente." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glow-border rounded-2xl p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <KeyRound className="h-4 w-4 text-neon-green" />
        Token da Meta
      </h2>
      <p className="mt-1 text-sm text-muted">
        Quando o token expirar, cole aqui o novo. É validado com a Meta e guardado cifrado.
      </p>

      <label htmlFor="meta-token" className="mt-4 block text-sm font-medium">
        Novo Token de Acesso (Meta)
      </label>
      <input
        id="meta-token"
        type="password"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder="EAAG…"
        className="mt-1.5 w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-neon-green focus:ring-4 focus:ring-neon-green/10"
      />

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={isSaving || !token.trim()}
          className="neon-green-btn flex items-center gap-2 rounded-full bg-green-500 px-5 py-2.5 text-sm font-semibold text-background hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? "A validar..." : "Atualizar Token"}
        </button>
        {feedback && (
          <p role="status" className={`text-sm ${feedback.ok ? "text-neon-green" : "text-danger"}`}>
            {feedback.text}
          </p>
        )}
      </div>
    </form>
  );
}
