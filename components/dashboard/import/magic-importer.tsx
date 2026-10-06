"use client";

import { useRef, useState, type DragEvent } from "react";
import { CheckCircle2, FileUp, Loader2, UploadCloud } from "lucide-react";
import Papa from "papaparse";
import { useRouter } from "@/i18n/navigation";
import { BTN_GHOST, BTN_PRIMARY, CARD, INPUT } from "@/components/dashboard/settings/ui";

// Magic Importer: arrastar e largar um CSV/Excel (ou o JSON exportado de outra ferramenta). O ficheiro é lido no browser
// (PapaParse para CSV, read-excel-file para Excel), o servidor adivinha que coluna é o quê (fuzzy matching) e mostra uma
// pré-visualização que o utilizador pode corrigir antes de importar. Nada é gravado até carregar em «Importar».

type Mode = "file" | "competitor";
type Field = "client_name" | "phone" | "email" | "notes" | "stage";
const FIELD_LABEL: Record<Field, string> = { client_name: "Nome do cliente", phone: "Telemóvel", email: "E-mail", notes: "Notas", stage: "Estado" };
const FIELDS = Object.keys(FIELD_LABEL) as Field[];
const MAX_FILE_BYTES = 4 * 1024 * 1024;

interface Preview {
  columns: string[];
  mapping: Partial<Record<Field, { column: string; confidence: number }>>;
  totalRows: number;
  valid: number;
  rejected: number;
  rejectedSample: { row: number; reason: string; value: string }[];
  sample: { name: string | null; waId: string; email: string | null; stage: string }[];
}
type Payload = { columns?: string[]; rows?: Record<string, unknown>[]; json?: unknown };

const ERRORS: Record<string, string> = {
  empty_file: "O ficheiro não tem linhas para importar.",
  phone_column_missing: "Não encontrámos a coluna do telemóvel. Escolha-a na lista abaixo.",
  payload_too_large: "O ficheiro é demasiado grande (máximo 4 MB). Divida-o em partes.",
  forbidden: "Só proprietários e gestores podem importar contactos.",
  invalid_input: "O ficheiro tem um formato que não conseguimos ler (máximo 5000 linhas).",
};

async function readFile(file: File, mode: Mode): Promise<Payload> {
  if (mode === "competitor") return { json: JSON.parse(await file.text()) };
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import("read-excel-file/browser");
    const sheet = (await readSheet(file)) as unknown[][];
    const [header = [], ...body] = sheet;
    const columns = header.map((h, i) => String(h ?? "").trim() || `Coluna ${i + 1}`);
    return { columns, rows: body.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i] == null ? "" : row[i] instanceof Date ? row[i].toISOString().slice(0, 10) : String(row[i])]))) };
  }
  const parsed = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: "greedy" });
  return { columns: parsed.meta.fields ?? [], rows: parsed.data };
}

export function MagicImporter({ defaultDialCode }: { defaultDialCode: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("file");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<"reading" | "importing" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [override, setOverride] = useState<Partial<Record<Field, string | null>>>({});
  const [dialCode, setDialCode] = useState(defaultDialCode);
  const [done, setDone] = useState<{ created: number; skippedExisting: number } | null>(null);

  const endpoint = mode === "file" ? "/api/import/magic" : "/api/import/competitor";

  async function call(kind: "preview" | "commit", data: Payload, mapping: typeof override) {
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: kind, dialCode, mapping, ...data }) });
    const body = (await res.json().catch(() => null)) as { success?: boolean; error?: string; preview?: Preview; result?: { created: number; skippedExisting: number } } | null;
    if (!res.ok || !body?.success) throw new Error(ERRORS[body?.error ?? ""] ?? "Não foi possível processar o ficheiro. Tente novamente.");
    return body;
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setDone(null);
    setPreview(null);
    setOverride({});
    if (file.size > MAX_FILE_BYTES) return setError(ERRORS.payload_too_large);
    const okType = mode === "competitor" ? /\.json$/i.test(file.name) : /\.(csv|tsv|txt|xlsx)$/i.test(file.name);
    if (!okType) return setError(mode === "competitor" ? "Escolha um ficheiro .json." : "Escolha um ficheiro .csv ou .xlsx (no Excel antigo: Guardar como → CSV).");
    setBusy("reading");
    try {
      const data = await readFile(file, mode);
      setPayload(data);
      setFileName(file.name);
      setPreview((await call("preview", data, {})).preview ?? null);
    } catch (err) {
      setError(err instanceof SyntaxError ? "Este ficheiro não é um JSON válido." : err instanceof Error ? err.message : "Não foi possível ler o ficheiro.");
    } finally {
      setBusy(null);
    }
  }

  async function refresh(next: typeof override) {
    if (!payload) return;
    setOverride(next);
    try {
      setPreview((await call("preview", payload, next)).preview ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    }
  }

  async function runImport() {
    if (!payload) return;
    setBusy("importing");
    setError(null);
    try {
      const body = await call("commit", payload, override);
      setDone(body.result ?? null);
      setPreview(null);
      setPayload(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setBusy(null);
    }
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2" role="tablist">
        {(["file", "competitor"] as const).map((value) => (
          <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => { setMode(value); setPayload(null); setPreview(null); setError(null); setDone(null); }} className={mode === value ? BTN_PRIMARY : BTN_GHOST}>
            {value === "file" ? "Ficheiro CSV / Excel" : "Migrar de outra ferramenta (JSON)"}
          </button>
        ))}
      </div>

      <div className={CARD}>
        <div
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => input.current?.click()}
          onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && input.current?.click()}
          role="button"
          tabIndex={0}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/60"}`}
        >
          {busy === "reading" ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <UploadCloud className="h-8 w-8 text-primary" />}
          <p className="text-sm font-medium text-foreground">{busy === "reading" ? "A ler o ficheiro..." : "Arraste o ficheiro para aqui, ou clique para escolher"}</p>
          <p className="text-xs text-muted">{mode === "file" ? "CSV ou Excel (.xlsx), até 5000 linhas. Não precisa de formatar nada: nós percebemos as colunas." : "O ficheiro JSON exportado da sua ferramenta anterior (HubSpot, Pipedrive, RD Station, Kommo...)."}</p>
          <input ref={input} type="file" hidden accept={mode === "file" ? ".csv,.tsv,.txt,.xlsx" : ".json,application/json"} onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = ""; }} />
        </div>

        <label className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted">
          Indicativo para números sem ele (+)
          <input value={dialCode} onChange={(event) => setDialCode(event.target.value.replace(/\D/g, "").slice(0, 4))} className={`${INPUT} w-24`} inputMode="numeric" aria-label="Indicativo do país" />
        </label>
      </div>

      {error && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      {done && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <p>
            <strong>{done.created}</strong> contactos importados.{done.skippedExisting > 0 && ` ${done.skippedExisting} já existiam (mesmo número) e ficaram como estavam.`}
          </p>
        </div>
      )}

      {preview && (
        <div className={CARD}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold"><FileUp className="h-4 w-4" />{fileName}</h2>
              <p className="mt-1 text-sm text-muted">{preview.valid} de {preview.totalRows} linhas prontas a importar{preview.rejected > 0 && `, ${preview.rejected} a ignorar (número inválido ou repetido)`}.</p>
            </div>
            <button type="button" disabled={busy !== null || preview.valid === 0 || !preview.mapping.phone} onClick={runImport} className={BTN_PRIMARY}>
              {busy === "importing" && <Loader2 className="h-4 w-4 animate-spin" />}Importar {preview.valid} contactos
            </button>
          </div>

          <h3 className="mt-6 text-sm font-semibold">Percebemos as colunas assim (pode corrigir):</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {FIELDS.map((field) => {
              const match = preview.mapping[field];
              return (
                <label key={field} className="flex items-center justify-between gap-3 text-sm">
                  <span>{FIELD_LABEL[field]}{match && match.confidence < 0.8 && <span className="ml-2 text-xs text-amber-300">(confirme)</span>}</span>
                  <select value={match?.column ?? ""} onChange={(event) => void refresh({ ...override, [field]: event.target.value || null })} className={`${INPUT} max-w-[55%]`}>
                    <option value="">Não importar</option>
                    {preview.columns.map((column) => <option key={column} value={column}>{column}</option>)}
                  </select>
                </label>
              );
            })}
          </div>

          {!preview.mapping.phone && <p className="mt-4 text-sm text-amber-300">{ERRORS.phone_column_missing}</p>}

          {preview.sample.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead><tr className="border-b border-border text-left text-muted"><th className="py-2 pr-4 font-medium">Nome</th><th className="py-2 pr-4 font-medium">Telemóvel</th><th className="py-2 pr-4 font-medium">E-mail</th><th className="py-2 font-medium">Estado</th></tr></thead>
                <tbody>{preview.sample.map((row) => <tr key={row.waId} className="border-b border-border/50"><td className="py-2 pr-4">{row.name ?? "—"}</td><td className="py-2 pr-4">+{row.waId}</td><td className="py-2 pr-4">{row.email ?? "—"}</td><td className="py-2">{row.stage}</td></tr>)}</tbody>
              </table>
              <p className="mt-2 text-xs text-muted">Primeiras {preview.sample.length} linhas.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
