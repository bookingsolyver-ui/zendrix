"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { BTN_PRIMARY, CARD, INPUT } from "@/components/dashboard/settings/ui";

export interface BankFormValues {
  bankName: string;
  holderName: string;
  iban: string;
  nib: string;
  instructions: string;
}

const FIELD_TEXT: Record<string, string> = {
  bank_name: "Indique o nome do banco.",
  holder_name: "Indique o titular da conta.",
  iban: "O IBAN não é válido: confira-o (por exemplo AO06 0000 0000 0000 0000 0000 0).",
  nib: "O NIB tem 21 dígitos.",
};

export function BankForm({ initial }: { initial: BankFormValues }) {
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const set = (key: keyof BankFormValues) => (event: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: event.target.value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setErrors([]);
    setSaved(false);
    try {
      const res = await fetch("/api/payments/bank-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, nib: values.nib || null, instructions: values.instructions || null }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setErrors(data?.error === "invalid_fields" ? (data.fields as string[]).map((f) => FIELD_TEXT[f] ?? f) : ["Não foi possível guardar. Tente novamente."]);
        return;
      }
      setSaved(true);
    } catch {
      setErrors(["Sem ligação ao servidor. Tente novamente."]);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${CARD} space-y-4`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-white/70">Banco<input value={values.bankName} onChange={set("bankName")} required maxLength={80} className={`${INPUT} mt-1 w-full`} placeholder="BAI, BFA, BIC…" /></label>
        <label className="block text-sm text-white/70">Titular da conta<input value={values.holderName} onChange={set("holderName")} required maxLength={120} className={`${INPUT} mt-1 w-full`} placeholder="Nome da empresa ou da pessoa" /></label>
      </div>
      <label className="block text-sm text-white/70">IBAN<input value={values.iban} onChange={set("iban")} required maxLength={60} className={`${INPUT} mt-1 w-full font-mono`} placeholder="AO06 0000 0000 0000 0000 0000 0" /></label>
      <label className="block text-sm text-white/70">NIB (opcional)<input value={values.nib} onChange={set("nib")} maxLength={40} className={`${INPUT} mt-1 w-full font-mono`} placeholder="21 dígitos" /></label>
      <label className="block text-sm text-white/70">Instruções ao cliente (opcional)
        <textarea value={values.instructions} onChange={set("instructions")} maxLength={300} rows={2} className={`${INPUT} mt-1 w-full`} placeholder="Ex.: use o seu nome como referência da transferência." />
      </label>
      {errors.length > 0 && <ul role="alert" className="space-y-1 text-sm text-red-300">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      {saved && <p className="text-sm text-emerald-300">Dados guardados. O agente já os envia quando um cliente quer pagar por transferência.</p>}
      <button type="submit" disabled={pending} className={`${BTN_PRIMARY} inline-flex items-center gap-2`}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Guardar dados bancários
      </button>
    </form>
  );
}
