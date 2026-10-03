"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

const ERRORS: Record<string, string> = {
  confirmation_required: "Escreva ELIMINAR para confirmar.",
  forbidden: "Apenas o proprietário pode eliminar a conta.",
  stripe_cancel_failed: "Não conseguimos cancelar a subscrição, por isso a conta NÃO foi eliminada. Cancele-a primeiro no portal de faturação e tente de novo.",
  rate_limited: "Demasiadas tentativas. Aguarde um pouco.",
};

// "Zona de perigo": eliminar a organização e todos os dados. Só o proprietário. Escrever ELIMINAR evita acidentes.
export function DeleteAccountCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const confirm = new FormData(event.currentTarget).get("confirm");
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(ERRORS[data?.error] ?? "Não foi possível eliminar a conta. Tente novamente.");
        setPending(false);
        return;
      }
      // A conta de Auth já não existe: vai-se para o início (a sessão deixa de ser válida).
      router.push("/");
      router.refresh();
    } catch {
      setError("Sem ligação ao servidor. Tente novamente.");
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-red-400/30 bg-red-500/5 p-6 sm:p-7">
      <h2 className="text-sm font-semibold text-red-200">Eliminar conta</h2>
      <p className="mt-2 text-sm text-white/50">
        Apaga <strong className="text-white/70">definitivamente</strong> a organização e tudo o que é dela: membros da equipa,
        canais ligados, conversas, mensagens, contactos, ficheiros de áudio e chaves de API. A subscrição é cancelada. Não
        há volta atrás.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 flex items-center gap-2 rounded-full border border-red-400/40 px-4 py-2.5 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
          Eliminar conta
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label htmlFor="confirm-delete" className="block text-sm text-white/70">
            Escreva <strong className="font-mono text-red-200">ELIMINAR</strong> para confirmar:
          </label>
          <input
            id="confirm-delete"
            name="confirm"
            autoComplete="off"
            required
            className="w-full max-w-xs rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-sm text-white outline-none focus:border-red-400/60"
          />
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? "A eliminar…" : "Eliminar tudo"}
            </button>
            <button type="button" disabled={pending} onClick={() => setOpen(false)} className="text-sm text-white/50 hover:text-white">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
