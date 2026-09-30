"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { BusinessState } from "@/lib/agent/business";
import {
  LIMITS,
  compileKnowledge,
  hasMinimumProfile,
  type BusinessProduct,
  type BusinessProfile,
} from "@/lib/agent/profile";

const fieldClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-emerald-500/50";

const SUBSCRIPTION_LABELS: Record<string, string> = {
  trialing: "período de teste",
  active: "ativa",
  past_due: "pagamento em atraso",
  canceled: "cancelada",
};

function Counter({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span className={`text-xs ${over ? "text-red-400" : "text-white/30"}`}>
      {value.length}/{max}
    </span>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1 text-xs text-red-400">{message}</p>
  ) : null;
}

export function BusinessForm({ initial }: { initial: BusinessState }) {
  const router = useRouter();
  const [profile, setProfile] = useState<BusinessProfile>(initial.profile);
  const [agentEnabled, setAgentEnabled] = useState(initial.agentEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const compiled = useMemo(() => compileKnowledge(profile), [profile]);
  const complete = hasMinimumProfile(profile);
  const { subscription } = initial;

  function set<K extends keyof BusinessProfile>(
    key: K,
    value: BusinessProfile[K],
  ) {
    setProfile((previous) => ({ ...previous, [key]: value }));
  }

  function setProduct(index: number, patch: Partial<BusinessProduct>) {
    setProfile((previous) => ({
      ...previous,
      products: previous.products.map((product, i) =>
        i === index ? { ...product, ...patch } : product,
      ),
    }));
  }

  async function save() {
    if (isSaving) return;
    setIsSaving(true);
    setErrors({});
    setFeedback(null);
    try {
      const res = await fetch("/api/business-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, agentEnabled }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrors(data?.errors ?? {});
        setFeedback({
          ok: false,
          text:
            res.status === 429
              ? "Demasiados pedidos. Aguarde um pouco."
              : (data?.errors?._ ?? "Verifique os campos assinalados."),
        });
        return;
      }
      setFeedback({
        ok: true,
        text: "Guardado. O agente já usa esta informação nas próximas respostas.",
      });
      router.refresh();
    } catch {
      setFeedback({
        ok: false,
        text: "Não foi possível guardar. Tente novamente.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  // Estado do agente, dito por extenso: ligar o interruptor não basta para ele responder.
  const status = !subscription.active
    ? {
        tone: "warn" as const,
        text: `A subscrição não está ativa (${SUBSCRIPTION_LABELS[subscription.status] ?? subscription.status}): o agente não responde até estar em dia.`,
      }
    : agentEnabled && !complete
      ? {
          tone: "warn" as const,
          text: "Preencha o nome comercial e a descrição: sem eles o agente não responde.",
        }
      : agentEnabled
        ? {
            tone: "ok" as const,
            text: "O agente está ligado e responde aos seus clientes.",
          }
        : {
            tone: "off" as const,
            text: "O agente está desligado: os clientes só recebem resposta da sua equipa.",
          };

  return (
    <div className="space-y-6">
      <div
        role="status"
        className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
          status.tone === "ok"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : status.tone === "warn"
              ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
              : "border-white/10 bg-white/5 text-white/60"
        }`}
      >
        {status.tone === "ok" ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        {status.text}
      </div>

      {initial.legacy && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          A ficha atual foi escrita como texto livre e aparece na{" "}
          <strong className="text-white/80">Descrição</strong>, sem perder nada.
          Ao guardar, passa a ser gerida por este formulário: pode dividi-la
          pelos campos.
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Agente de IA</h2>
            <p className="mt-1 text-xs text-white/50">
              Responde aos clientes no WhatsApp com base nesta ficha.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={agentEnabled}
            aria-label="Agente de IA ligado"
            onClick={() => setAgentEnabled((value) => !value)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              agentEnabled
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-white/10 text-white/50"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${agentEnabled ? "bg-emerald-400" : "bg-white/40"}`}
            />
            {agentEnabled ? "Ligado" : "Desligado"}
          </button>
        </div>
        <FieldError message={errors._} />
      </section>

      <section className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-sm font-semibold text-white">Sobre o negócio</h2>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="biz-name"
              className="text-xs font-medium text-white/50"
            >
              Nome comercial
            </label>
            <Counter value={profile.businessName} max={LIMITS.businessName} />
          </div>
          <input
            id="biz-name"
            value={profile.businessName}
            onChange={(event) => set("businessName", event.target.value)}
            placeholder="Ex: Clínica Sol"
            className={`${fieldClass} mt-1.5`}
          />
          <FieldError message={errors.businessName} />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="biz-description"
              className="text-xs font-medium text-white/50"
            >
              Descrição
            </label>
            <Counter value={profile.description} max={LIMITS.description} />
          </div>
          <textarea
            id="biz-description"
            value={profile.description}
            onChange={(event) => set("description", event.target.value)}
            rows={5}
            placeholder="Quem são, o que fazem, a quem se dirigem, onde ficam…"
            className={`${fieldClass} mt-1.5 resize-y`}
          />
          <FieldError message={errors.description} />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Produtos e serviços
            </h2>
            <p className="mt-1 text-xs text-white/50">
              O agente só diz preços que estejam aqui. {profile.products.length}
              /{LIMITS.products}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              set("products", [
                ...profile.products,
                { name: "", price: "", description: "" },
              ])
            }
            disabled={profile.products.length >= LIMITS.products}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </button>
        </div>
        <FieldError message={errors.products} />

        {profile.products.length === 0 && (
          <p className="mt-4 rounded-xl border border-white/5 bg-black/20 px-4 py-6 text-center text-sm text-white/40">
            Ainda não adicionou nenhum produto ou serviço.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {profile.products.map((product, index) => (
            <div
              key={index}
              className="rounded-xl border border-white/5 bg-black/20 p-4"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                <div>
                  <input
                    value={product.name}
                    onChange={(event) =>
                      setProduct(index, { name: event.target.value })
                    }
                    placeholder="Nome (ex: Consulta geral)"
                    aria-label={`Nome do produto ${index + 1}`}
                    className={fieldClass}
                  />
                  <FieldError message={errors[`products.${index}.name`]} />
                </div>
                <div>
                  <input
                    value={product.price}
                    onChange={(event) =>
                      setProduct(index, { price: event.target.value })
                    }
                    placeholder="Preço (ex: 40 €)"
                    aria-label={`Preço do produto ${index + 1}`}
                    className={fieldClass}
                  />
                  <FieldError message={errors[`products.${index}.price`]} />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "products",
                      profile.products.filter((_, i) => i !== index),
                    )
                  }
                  aria-label={`Remover produto ${index + 1}`}
                  className="flex h-[42px] w-[42px] items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={product.description}
                onChange={(event) =>
                  setProduct(index, { description: event.target.value })
                }
                rows={2}
                placeholder="Descrição (opcional)"
                aria-label={`Descrição do produto ${index + 1}`}
                className={`${fieldClass} mt-3 resize-y`}
              />
              <FieldError message={errors[`products.${index}.description`]} />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="biz-hours"
              className="text-sm font-semibold text-white"
            >
              Horários e contactos
            </label>
            <Counter value={profile.hours} max={LIMITS.hours} />
          </div>
          <textarea
            id="biz-hours"
            value={profile.hours}
            onChange={(event) => set("hours", event.target.value)}
            rows={3}
            placeholder="Ex: Segunda a sexta, 9h às 18h. Rua das Flores 12, Lisboa. Tel. 210 000 000."
            className={`${fieldClass} mt-2 resize-y`}
          />
          <FieldError message={errors.hours} />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="biz-rules"
              className="text-sm font-semibold text-white"
            >
              Regras de atendimento
            </label>
            <Counter value={profile.rules} max={LIMITS.rules} />
          </div>
          <textarea
            id="biz-rules"
            value={profile.rules}
            onChange={(event) => set("rules", event.target.value)}
            rows={5}
            placeholder="O que o assistente deve e não deve fazer. Ex: Cancelamentos com menos de 24 h perdem o sinal. Nunca marcar sem confirmar o nome."
            className={`${fieldClass} mt-2 resize-y`}
          />
          <FieldError message={errors.rules} />
        </div>
      </section>

      <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <summary className="cursor-pointer text-sm font-medium text-white/70">
          O que o agente lê ({compiled.length}/{LIMITS.compiled} caracteres)
        </summary>
        <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-4 text-xs leading-relaxed text-white/60">
          {compiled || "(vazio: sem ficha o agente não responde)"}
        </pre>
      </details>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={isSaving}
          className="neon-green-btn flex items-center gap-2 rounded-full bg-green-500 px-6 py-2.5 text-sm font-semibold text-background hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar
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
