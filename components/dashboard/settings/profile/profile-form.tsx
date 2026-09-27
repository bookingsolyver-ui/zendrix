"use client";

import { useState } from "react";
import { Mail, Phone, User } from "lucide-react";

const inputClassName =
  "w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-emerald-500/50";

export function ProfileForm() {
  const [name, setName] = useState("Filipe Oliveira");
  const [email, setEmail] = useState("bookings.olyver@gmail.com");
  const [phone, setPhone] = useState("");

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
              onChange={(event) => setEmail(event.target.value)}
              className={inputClassName}
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
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="923 456 789"
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        className="neon-green-btn mt-6 rounded-full bg-green-500 px-5 py-2.5 text-sm font-semibold text-background hover:bg-green-400"
      >
        Guardar Alterações
      </button>
    </div>
  );
}
