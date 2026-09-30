import { useTranslations } from "next-intl";
import { ArrowRight, Mic, MoreVertical, Search, Smile, StickyNote } from "lucide-react";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";

type PhoneMessage = { from: "bot" | "customer"; text: string };
type ChatMessage = { from: "contact" | "agent"; text: string };
type InboxContact = { name: string; preview: string; time: string };

export function SameNumberSection() {
  const t = useTranslations("Landing.sameNumber");
  const phoneMessages = t.raw("phoneMessages") as PhoneMessage[];
  const chatMessages = t.raw("chatMessages") as ChatMessage[];
  const inboxContacts = t.raw("inboxContacts") as InboxContact[];

  return (
    <section id="section-same-number" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")} <span className="neon-green-text">{t("titleHighlight")}</span>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-white/50">{t("subtitle")}</p>
      </div>

      <div className="mt-14 flex flex-col items-center gap-6 lg:flex-row lg:items-stretch lg:justify-center lg:gap-5">
        {/* Telemóvel — WhatsApp simulado */}
        <div className="relative mx-auto w-[280px] shrink-0 sm:w-[300px]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-6 -bottom-8 h-32 rounded-full bg-emerald-500/15 blur-3xl"
          />

          <div className="relative rounded-[2.5rem] border-[8px] border-[#222] bg-neutral-900 p-1.5 shadow-2xl shadow-black/60">
            <div className="relative h-[560px] overflow-hidden rounded-[2rem] bg-[#0b141a]">
              {/* Notch */}
              <div className="absolute left-1/2 top-0 z-10 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-[#222]" />

              {/* Header WhatsApp */}
              <div className="flex items-center gap-2.5 bg-[#202c33] px-4 pb-3 pt-7">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <WhatsAppGlyph className="h-4 w-4 text-emerald-400" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">{t("phoneBotName")}</p>
                  <p className="text-[10px] text-emerald-400">online</p>
                </div>
                <MoreVertical className="h-4 w-4 shrink-0 text-white/40" />
              </div>

              {/* Bolhas de chat */}
              <div
                aria-hidden
                className="absolute inset-0 top-[52px]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                }}
              />
              <div className="relative flex flex-col gap-2.5 px-3 pb-16 pt-4">
                {phoneMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={
                      msg.from === "customer"
                        ? "ml-auto max-w-[80%] self-end rounded-lg rounded-tr-none bg-[#005c4b] p-3 text-[11px] leading-relaxed text-white"
                        : "mr-auto max-w-[80%] self-start rounded-lg rounded-tl-none bg-[#202c33] p-3 text-[11px] leading-relaxed text-white/90"
                    }
                  >
                    {msg.text}
                  </div>
                ))}
              </div>

              {/* Barra de input do telemóvel */}
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-[#1f2c34] px-3 py-2.5">
                <Smile className="h-4 w-4 shrink-0 text-white/40" />
                <div className="h-6 flex-1 rounded-full bg-white/5" />
                <Mic className="h-4 w-4 shrink-0 text-white/40" />
              </div>
            </div>
          </div>
        </div>

        {/* Conector de sincronização */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-2 py-2 lg:py-0">
          <ArrowRight className="hidden h-5 w-5 shrink-0 text-emerald-400 lg:block" />
          <ArrowRight className="h-5 w-5 shrink-0 rotate-90 text-emerald-400 lg:hidden" />
          <span className="whitespace-nowrap text-[11px] font-medium text-emerald-400">
            {t("syncLabel")}
          </span>
        </div>

        {/* Ecrã do computador — Shared Inbox */}
        <div className="flex h-[560px] w-full max-w-2xl overflow-hidden rounded-[12px] border border-white/10 bg-[#111] shadow-2xl">
          {/* Sidebar de contactos */}
          <div className="hidden w-[220px] shrink-0 flex-col border-r border-white/10 bg-white/5 sm:flex">
            <div className="border-b border-white/10 px-4 py-3.5">
              <span className="text-sm font-semibold text-foreground">{t("inboxTitle")}</span>
            </div>
            <div className="flex items-center gap-2 border-b border-white/10 px-3.5 py-2.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-white/30" />
              <span className="h-2 w-20 rounded-full bg-white/10" />
            </div>
            <div className="flex-1 overflow-hidden">
              {inboxContacts.map((contact, index) => (
                <div
                  key={contact.name}
                  className={`flex items-center gap-2.5 border-l-2 px-3.5 py-3 ${
                    index === 0
                      ? "border-l-emerald-500 bg-emerald-500/10"
                      : "border-l-transparent"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white/70">
                    {contact.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1">
                      <p className="truncate text-xs font-medium text-foreground">{contact.name}</p>
                      <span className="shrink-0 text-[10px] text-white/30">{contact.time}</span>
                    </div>
                    <p className="truncate text-[11px] text-white/40">{contact.preview}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Área de chat central */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white/70">
                {t("activeContact").charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{t("activeContact")}</p>
                <p className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <WhatsAppGlyph className="h-2.5 w-2.5" />
                  WhatsApp
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-2.5 overflow-hidden px-4 py-4">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={
                    msg.from === "agent"
                      ? "ml-auto max-w-[80%] rounded-xl rounded-tr-sm bg-emerald-500/15 px-3 py-2 text-[11.5px] leading-relaxed text-white"
                      : "mr-auto max-w-[80%] rounded-xl rounded-tl-sm bg-white/5 px-3 py-2 text-[11.5px] leading-relaxed text-white/80"
                  }
                >
                  {msg.text}
                </div>
              ))}

              <div className="flex items-start gap-2.5 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2.5">
                <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                <p className="text-[11px] leading-relaxed text-amber-200/80">
                  <span className="font-semibold text-amber-300">{t("internalNoteLabel")}: </span>
                  {t("internalNote")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 border-t border-white/10 px-3.5 py-3">
              <div className="h-9 flex-1 rounded-full border border-white/10 bg-white/5 px-3.5 text-[11px] leading-9 text-white/30">
                {t("inputPlaceholder")}
              </div>
              <div
                aria-hidden="true"
                className="neon-green-btn shrink-0 rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-background"
              >
                {t("sendLabel")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
