import { LogIn, ShieldCheck, Smartphone } from "lucide-react";

const ITEMS = [
  { icon: LogIn, text: "Login do Facebook da empresa" },
  {
    icon: Smartphone,
    text: "Um número disponível para a API (que não esteja já a ser usado no WhatsApp normal)",
  },
  { icon: ShieldCheck, text: "Acesso ao código SMS que a Meta vai enviar para esse número" },
];

export function TenhaEmMaosPanel() {
  return (
    <div className="glow-border rounded-2xl p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-neon-green">
        Tenha em mãos
      </p>
      <ul className="mt-4 space-y-3">
        {ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <li key={item.text} className="flex items-start gap-3 text-sm text-muted">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              {item.text}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
