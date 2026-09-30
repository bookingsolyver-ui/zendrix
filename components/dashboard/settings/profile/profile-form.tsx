"use client";

import { useState } from "react";
import { Loader2, Mail, Phone, User } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useCurrentUser } from "@/components/dashboard/current-user-context";

const inputClassName =
  "w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-emerald-500/50";

export function ProfileForm() {
  const currentUser = useCurrentUser();
  const [name, setName] = useState(currentUser?.name ?? "");
  const email = currentUser?.email ?? "";
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("save_failed");
      setFeedback({ ok: true, text: "Alterações guardadas." });
      router.refresh();
    } catch {
      setFeedback({ ok: false, text: "Não foi possível guardar. Tente novamente." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-sm font-semibold text-white">Dados pessoais</h2>

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="profile-name" className="text-xs font-medium text-white/50">
            Nome
          </label>
          <div className="relative mt-1.5">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
            />
          </div>
        </div>

        <div>
          <label htmlFor="profile-email" className="text-xs font-medium text-white/50">
            E-mail
          </label>
          <div className="relative mt-1.5">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              id="profile-email"
              type="email"
              value={email}
              readOnly
              aria-readonly="true"
              title="O e-mail é o da sua conta e não pode ser alterado aqui."
              className={`${inputClassName} cursor-not-allowed opacity-70`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="profile-phone" className="text-xs font-medium text-white/50">
            Telemóvel Pessoal
          </label>
          <div className="relative mt-1.5">
            <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              id="profile-phone"
              type="tel"
              disabled
              title="Disponível em breve."
              placeholder="Disponível em breve"
              className={`${inputClassName} cursor-not-allowed opacity-50`}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !name.trim()}
          className="neon-green-btn flex items-center gap-2 rounded-full bg-green-500 px-5 py-2.5 text-sm font-semibold text-background hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar Alterações
        </button>
        {feedback && (
          <p
            role="status"
            className={`text-sm ${feedback.ok ? "text-emerald-400" : "text-red-400"}`}
          >
            {feedback.text}
          </p>
        )}
      </div>
    </div>
  );
}
