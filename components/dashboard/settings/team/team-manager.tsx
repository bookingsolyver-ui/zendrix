"use client";

import { useState, type FormEvent } from "react";
import { Check, Copy, Loader2, Mail, UserPlus } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { canManageRole, grantableRoles, ROLE_DESCRIPTION, ROLE_LABEL, type Role } from "@/lib/roles";
import type { PendingInvite, TeamMember } from "@/components/dashboard/settings/team/team-data";

const ERRORS: Record<string, string> = {
  invalid_input: "Verifique o e-mail e o papel.",
  already_member: "Esta pessoa já faz parte da equipa.",
  already_has_account: "Este e-mail já tem uma conta noutra organização: cada pessoa pertence a uma só.",
  seats_full: "A equipa está cheia. Remova um membro ou revogue um convite.",
  subscription_required: "Ative o seu plano para convidar pessoas.",
  forbidden: "Não tem permissão para isto.",
  cannot_manage_self: "Não pode alterar a sua própria conta aqui.",
  rate_limited: "Demasiados pedidos. Aguarde um pouco.",
  not_found: "Já não existe.",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok && data?.success, data };
}

// Equipa: convidar por e-mail com papéis reais, alterar papéis e remover membros. A API volta a verificar tudo
// (quem pode o quê): isto só decide o que se mostra.
export function TeamManager({
  members,
  invites,
  myRole,
  planActive,
}: {
  members: TeamMember[];
  invites: PendingInvite[];
  myRole: Role | null;
  planActive: boolean;
}) {
  const router = useRouter();
  const locale = useLocale();
  const canManage = myRole === "OWNER" || myRole === "MANAGER";
  const roles = myRole ? grantableRoles(myRole) : [];

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; emailSent: boolean; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(key: string, action: () => Promise<{ ok: boolean; data: { error?: string } | null }>) {
    setBusy(key);
    setError(null);
    try {
      const { ok, data } = await action();
      if (!ok) setError(ERRORS[data?.error ?? ""] ?? "Não foi possível concluir. Tente novamente.");
      else router.refresh();
    } catch {
      setError("Sem ligação ao servidor. Tente novamente.");
    } finally {
      setBusy(null);
      setConfirmRemove(null);
    }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy("invite");
    setError(null);
    setResult(null);
    try {
      const { ok, data: body } = await call("/api/team/invites", "POST", {
        email: data.get("email"),
        role: data.get("role"),
        locale,
      });
      if (!ok) {
        setError(ERRORS[body?.error] ?? "Não foi possível enviar o convite. Tente novamente.");
      } else {
        setResult({ url: body.inviteUrl, emailSent: body.emailSent, email: body.invite.email });
        form.reset();
        router.refresh();
      }
    } catch {
      setError("Sem ligação ao servidor. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* o link continua visível para copiar à mão */
    }
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <form onSubmit={invite} className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <UserPlus className="h-4 w-4 text-emerald-400" />
            Convidar membro
          </p>
          {!planActive && <p className="mt-2 text-sm text-amber-200">Ative o seu plano para convidar pessoas.</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              placeholder="email@empresa.com"
              aria-label="E-mail do convidado"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
            />
            <select
              name="role"
              defaultValue="STAFF"
              aria-label="Papel"
              className="rounded-xl border border-white/10 bg-[#111] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy !== null || !planActive}
              className="neon-btn flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === "invite" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Enviar convite
            </button>
          </div>
          <ul className="mt-3 space-y-0.5 text-xs text-white/40">
            {roles.map((role) => (
              <li key={role}>
                <strong className="font-medium text-white/60">{ROLE_LABEL[role]}:</strong> {ROLE_DESCRIPTION[role]}
              </li>
            ))}
          </ul>

          {result && (
            <div role="status" className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <p>
                {result.emailSent
                  ? `Convite enviado para ${result.email}.`
                  : `Convite criado para ${result.email}, mas o e-mail não foi enviado (o envio de e-mail não está configurado). Copie o link e envie-o à pessoa:`}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input readOnly value={result.url} onFocus={(e) => e.currentTarget.select()} aria-label="Link do convite" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white/80" />
                <button type="button" onClick={() => copy(result.url)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/10">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
              <p className="mt-2 text-xs text-emerald-100/70">O link é pessoal e vale 7 dias.</p>
            </div>
          )}
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/40">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">E-mail</th>
              <th className="px-5 py-3 font-medium">Papel</th>
              <th className="px-5 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const manageable = myRole !== null && !member.isSelf && canManageRole(myRole, member.role);
              return (
                <tr key={member.id} className="border-b border-white/5 last:border-b-0">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                        {initials(member.name)}
                      </span>
                      <span className="font-medium text-white">
                        {member.name}
                        {member.isSelf && <span className="ml-2 text-xs font-normal text-white/40">(você)</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-white/60">{member.email}</td>
                  <td className="px-5 py-4">
                    {myRole === "OWNER" && manageable ? (
                      <select
                        value={member.role}
                        disabled={busy !== null}
                        aria-label={`Papel de ${member.name}`}
                        onChange={(e) => run(`role:${member.id}`, () => call(`/api/team/members/${member.id}`, "PATCH", { role: e.target.value }))}
                        className="rounded-lg border border-white/10 bg-[#111] px-2.5 py-1.5 text-sm text-white outline-none focus:border-emerald-500/50"
                      >
                        {grantableRoles("OWNER").map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABEL[role]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70">{ROLE_LABEL[member.role]}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {manageable &&
                      (confirmRemove === member.id ? (
                        <span className="inline-flex items-center gap-3 text-xs">
                          <button type="button" disabled={busy !== null} onClick={() => run(`rm:${member.id}`, () => call(`/api/team/members/${member.id}`, "DELETE"))} className="font-medium text-red-300 hover:text-red-200">
                            {busy === `rm:${member.id}` ? "A remover…" : "Confirmar remoção"}
                          </button>
                          <button type="button" onClick={() => setConfirmRemove(null)} className="text-white/40 hover:text-white/70">
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setConfirmRemove(member.id)} className="text-xs text-white/40 hover:text-red-300">
                          Remover
                        </button>
                      ))}
                  </td>
                </tr>
              );
            })}
            {invites.map((invite) => {
              const revocable = myRole === "OWNER" || (myRole === "MANAGER" && invite.role === "STAFF");
              return (
                <tr key={invite.id} className="border-b border-white/5 last:border-b-0">
                  <td className="px-5 py-4 text-white/40">
                    <span className="rounded-full border border-dashed border-white/20 px-2.5 py-1 text-xs">Convite pendente</span>
                  </td>
                  <td className="px-5 py-4 text-white/60">{invite.email}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70">{ROLE_LABEL[invite.role]}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {revocable && (
                      <button type="button" disabled={busy !== null} onClick={() => run(`inv:${invite.id}`, () => call(`/api/team/invites/${invite.id}`, "DELETE"))} className="text-xs text-white/40 hover:text-red-300">
                        {busy === `inv:${invite.id}` ? "A revogar…" : "Revogar"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
