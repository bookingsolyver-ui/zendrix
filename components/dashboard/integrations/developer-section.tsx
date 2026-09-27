"use client";

import { useState } from "react";
import { Check, Code2, Copy } from "lucide-react";

function generateWebhookUrl() {
  const id = Math.random().toString(36).slice(2, 10);
  return `https://hooks.zentrix.com/wh_${id}`;
}

export function DeveloperSection() {
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    setWebhookUrl(generateWebhookUrl());
    setCopied(false);
  }

  async function handleCopy() {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard access denied — ignore silently
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-7 sm:p-9">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Code2 className="h-5 w-5 text-primary-2" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-white">
            A sua plataforma não está na lista?
          </h2>
          <p className="mt-2 max-w-md text-sm text-white/50">
            Use a nossa API ou receba eventos via Webhooks personalizados.
          </p>

          <button
            type="button"
            onClick={handleGenerate}
            className="neon-btn mt-6 rounded-full px-5 py-2.5 text-sm font-semibold text-background"
          >
            Gerar Webhook
          </button>

          {webhookUrl && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5">
              <code className="flex-1 truncate text-xs text-emerald-400">{webhookUrl}</code>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copiar URL do webhook"
                className="shrink-0 rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>

        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-4 text-xs leading-relaxed sm:text-[13px]">
          <code>
            <span className="text-primary-2">curl</span> <span className="text-blue-400">-X POST</span>{" "}
            <span className="text-emerald-400">https://api.zentrix.com/v1/webhooks</span> \{"\n"}
            {"  "}
            <span className="text-blue-400">-H</span>{" "}
            <span className="text-amber-300">&quot;Authorization: Bearer sk_live_...&quot;</span> \{"\n"}
            {"  "}
            <span className="text-blue-400">-H</span>{" "}
            <span className="text-amber-300">&quot;Content-Type: application/json&quot;</span> \{"\n"}
            {"  "}
            <span className="text-blue-400">-d</span>{" "}
            <span className="text-white/70">
              &apos;{"{"}
              <span className="text-emerald-400">&quot;event&quot;</span>:{" "}
              <span className="text-amber-300">&quot;order.paid&quot;</span>, {"\n    "}
              <span className="text-emerald-400">&quot;url&quot;</span>:{" "}
              <span className="text-amber-300">&quot;https://minhaloja.com/webhook&quot;</span>
              {"}"}&apos;
            </span>
          </code>
        </pre>
      </div>
    </div>
  );
}
