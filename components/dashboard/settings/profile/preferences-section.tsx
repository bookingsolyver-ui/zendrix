"use client";

import { useState } from "react";
import { ChevronDown, Globe } from "lucide-react";

const LANGUAGES = [
  { value: "pt", label: "Português" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

const TIMEZONES = [
  "Africa/Luanda (GMT+1)",
  "Europe/Lisbon (GMT+0)",
  "America/Sao_Paulo (GMT-3)",
];

const selectClassName =
  "w-full appearance-none rounded-lg border border-white/10 bg-white/5 py-2.5 pl-3 pr-9 text-sm text-white outline-none transition-colors focus:border-emerald-500/50";

export function PreferencesSection() {
  const [language, setLanguage] = useState("pt");
  const [timezone, setTimezone] = useState(TIMEZONES[0]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
        <Globe className="h-4 w-4 text-emerald-400" />
        Preferências
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="preferred-language" className="text-xs font-medium text-white/50">
            Idioma
          </label>
          <div className="relative mt-1.5">
            <select
              id="preferred-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className={selectClassName}
            >
              {LANGUAGES.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#111]">
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          </div>
        </div>

        <div>
          <label htmlFor="preferred-timezone" className="text-xs font-medium text-white/50">
            Fuso Horário
          </label>
          <div className="relative mt-1.5">
            <select
              id="preferred-timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className={selectClassName}
            >
              {TIMEZONES.map((option) => (
                <option key={option} value={option} className="bg-[#111]">
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
