import { Camera, MessageCircle } from "lucide-react";
import { WhatsAppGlyph } from "@/components/icons/whatsapp-glyph";

const CHANNELS = [
  { name: "WhatsApp", icon: WhatsAppGlyph, color: "#25D366", amount: "Kz 0", share: 0 },
  { name: "Instagram Direct", icon: Camera, color: "#E1306C", amount: "Kz 0", share: 0 },
  { name: "Facebook Messenger", icon: MessageCircle, color: "#0084FF", amount: "Kz 0", share: 0 },
];

export function ChannelTable() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
      <h2 className="text-sm font-semibold text-white">Receita por Canal</h2>

      <div className="mt-5 space-y-4">
        {CHANNELS.map((channel) => {
          const Icon = channel.icon;

          return (
            <div key={channel.name}>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5 text-white/80">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${channel.color}1a` }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: channel.color }} />
                  </span>
                  {channel.name}
                </span>
                <span className="font-medium text-white">{channel.amount}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  style={{ width: `${channel.share}%`, backgroundColor: channel.color }}
                  className="h-full rounded-full"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
