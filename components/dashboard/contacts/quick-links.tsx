import { Inbox, Layers, PlugZap } from "lucide-react";
import { Link } from "@/i18n/navigation";

const LINKS = [
  { href: "/dashboard/inbox", icon: Inbox, title: "Ver conversas", description: "Cada pessoa que escreve entra aqui sozinha. Responda na caixa de entrada." },
  { href: "/dashboard/contatos/segmentos", icon: Layers, title: "Ver segmentos", description: "Grupos de contactos por fase, atualizados automaticamente." },
  { href: "/dashboard/settings/channels", icon: PlugZap, title: "Ligar canais", description: "Ligue o WhatsApp, o Instagram e o Messenger para receber mais contactos." },
];

// Atalhos para o que realmente existe. Server Component: os ícones são usados aqui, nunca passados a um Client Component.
export function ContactsQuickLinks() {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-foreground">Comece por aqui</h2>
      <p className="mt-1 text-sm text-muted">Os caminhos mais rápidos para fazer crescer e organizar a sua base.</p>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {LINKS.map((link) => {
          const Icon = link.icon;

          return (
            <Link key={link.href} href={link.href} className="glow-border flex flex-col gap-3 rounded-2xl p-5 transition-colors hover:border-primary">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
                <Icon className="h-5 w-5 text-neon-green" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">{link.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">{link.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
