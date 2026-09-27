import { useTranslations } from "next-intl";
import { Camera, Coins, DollarSign, Euro, MessageCircle, Sparkles } from "lucide-react";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";

function BentoCard({
  wide,
  children,
}: {
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`group rounded-3xl border border-white/5 bg-white/[0.02] p-7 transition-colors hover:bg-white/[0.04] sm:p-8 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      {children}
    </div>
  );
}

function InboxCard({ title, description }: { title: string; description: string }) {
  return (
    <BentoCard wide>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#25D366]/10 ring-1 ring-[#25D366]/25">
          <WhatsAppGlyph className="h-5 w-5 text-[#25D366]" />
        </span>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E1306C]/10 ring-1 ring-[#E1306C]/25">
          <Camera className="h-5 w-5 text-[#E1306C]" />
        </span>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0084FF]/10 ring-1 ring-[#0084FF]/25">
          <MessageCircle className="h-5 w-5 text-[#0084FF]" />
        </span>
      </div>
      <h3 className="mt-6 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-white/50">{description}</p>
    </BentoCard>
  );
}

function PaymentsCard({ title, description }: { title: string; description: string }) {
  return (
    <BentoCard>
      <div className="flex items-center gap-2">
        {[Coins, Euro, DollarSign].map((Icon, index) => (
          <span
            key={index}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-green/10"
          >
            <Icon className="h-4 w-4 text-neon-green" />
          </span>
        ))}
      </div>
      <h3 className="mt-6 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/50">{description}</p>
    </BentoCard>
  );
}

function CrmCard({ title, description }: { title: string; description: string }) {
  const columns = [
    { label: "Novo", tone: "bg-white/10" },
    { label: "Negociação", tone: "bg-primary-2/30" },
    { label: "Fechado", tone: "bg-neon-green/30" },
  ];

  return (
    <BentoCard>
      <div className="flex gap-2">
        {columns.map((column) => (
          <div key={column.label} className="flex-1 space-y-1.5">
            <div className={`h-1.5 w-full rounded-full ${column.tone}`} />
            <div className="h-8 rounded-lg border border-white/5 bg-white/[0.03]" />
            <div className="h-8 rounded-lg border border-white/5 bg-white/[0.03]" />
          </div>
        ))}
      </div>
      <h3 className="mt-6 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/50">{description}</p>
    </BentoCard>
  );
}

function AiCard({
  title,
  description,
  chatLine1,
  chatLine2,
}: {
  title: string;
  description: string;
  chatLine1: string;
  chatLine2: string;
}) {
  return (
    <BentoCard wide>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/25">
        <Sparkles className="h-5 w-5 text-primary-2" />
      </span>
      <h3 className="mt-6 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-white/50">{description}</p>

      <div className="mt-5 space-y-2 rounded-xl border border-white/5 bg-black/40 p-4 font-mono text-xs leading-relaxed text-white/60">
        <p>{chatLine1}</p>
        <p className="text-neon-green">{chatLine2}</p>
      </div>
    </BentoCard>
  );
}

export function BentoGrid() {
  const t = useTranslations("Landing");

  return (
    <section id="product" className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
      <div className="text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("bentoTitle")}</h2>
        <p className="mt-3 text-white/50">{t("bentoSubtitle")}</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InboxCard title={t("bento.inboxTitle")} description={t("bento.inboxDescription")} />
        <PaymentsCard
          title={t("bento.paymentsTitle")}
          description={t("bento.paymentsDescription")}
        />
        <CrmCard title={t("bento.crmTitle")} description={t("bento.crmDescription")} />
        <AiCard
          title={t("bento.aiTitle")}
          description={t("bento.aiDescription")}
          chatLine1={t("bento.aiChatLine1")}
          chatLine2={t("bento.aiChatLine2")}
        />
      </div>
    </section>
  );
}
