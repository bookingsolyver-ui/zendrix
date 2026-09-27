"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ROLES, TEAM_MEMBERS, type TeamRole } from "@/components/dashboard/settings/team/team-data";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function TeamTable() {
  const [roles, setRoles] = useState<Record<string, TeamRole>>(() =>
    Object.fromEntries(TEAM_MEMBERS.map((member) => [member.id, member.role])),
  );

  if (TEAM_MEMBERS.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
        <p className="text-sm text-white/50">Ainda não convidou nenhum membro para a equipa.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-white/40">
            <th className="px-5 py-3 font-medium">Nome</th>
            <th className="px-5 py-3 font-medium">E-mail</th>
            <th className="px-5 py-3 font-medium">Papel</th>
            <th className="px-5 py-3 font-medium">Último Acesso</th>
          </tr>
        </thead>
        <tbody>
          {TEAM_MEMBERS.map((member) => (
            <tr
              key={member.id}
              className="border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.03]"
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                    {initials(member.name)}
                  </span>
                  <span className="font-medium text-white">{member.name}</span>
                </div>
              </td>
              <td className="px-5 py-4 text-white/60">{member.email}</td>
              <td className="px-5 py-4">
                <div className="relative inline-block">
                  <select
                    value={roles[member.id]}
                    onChange={(event) =>
                      setRoles((prev) => ({
                        ...prev,
                        [member.id]: event.target.value as TeamRole,
                      }))
                    }
                    className="appearance-none rounded-lg border border-white/10 bg-white/5 py-1.5 pl-3 pr-8 text-sm text-white outline-none focus:border-emerald-500/50"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role} className="bg-[#111]">
                        {role}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
                </div>
              </td>
              <td className="px-5 py-4 text-white/50">{member.lastAccess}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
