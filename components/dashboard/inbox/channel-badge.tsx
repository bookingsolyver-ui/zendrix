import { InstagramGlyph, MessengerGlyph } from "@/components/icons/channel-icons";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";
import { CHANNEL_LABEL, type ChannelPlatform } from "@/lib/inbox/channels";

// A cor da marca, subtil: fundo translúcido e ícone na cor do canal (verde, rosa em gradiente, azul).
const STYLE: Record<ChannelPlatform, string> = {
  WHATSAPP: "bg-emerald-500/15 text-emerald-400",
  INSTAGRAM: "bg-gradient-to-br from-fuchsia-500/20 via-pink-500/20 to-amber-400/20 text-pink-400",
  MESSENGER: "bg-sky-500/15 text-sky-400",
};

const SIZE = {
  sm: { box: "h-4 w-4", icon: "h-2.5 w-2.5" },
  md: { box: "h-6 w-6", icon: "h-3.5 w-3.5" },
  lg: { box: "h-11 w-11", icon: "h-5 w-5" },
} as const;

// O ícone do canal de uma conversa. `role="img"` + aria-label: o canal também é informação para quem não vê cores.
export function ChannelBadge({
  platform,
  size = "md",
  className = "",
}: {
  platform: ChannelPlatform;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const label = CHANNEL_LABEL[platform];
  const Glyph = platform === "INSTAGRAM" ? InstagramGlyph : platform === "MESSENGER" ? MessengerGlyph : WhatsAppGlyph;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${SIZE[size].box} ${STYLE[platform]} ${className}`}
    >
      <Glyph className={SIZE[size].icon} />
    </span>
  );
}
