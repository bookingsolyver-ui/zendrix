import { Calendar, Link2 } from "lucide-react";

export function WhatsAppTopLinks() {
  return (
    <div className="flex flex-wrap items-center gap-5 text-sm">
      <a
        href="#conectar-facebook"
        className="flex items-center gap-2 text-muted transition-colors hover:text-foreground"
      >
        <Link2 className="h-4 w-4" />
        Conectar com o Facebook
      </a>
      <a
        href="#agendar-call"
        className="flex items-center gap-2 text-muted transition-colors hover:text-foreground"
      >
        <Calendar className="h-4 w-4" />
        Agendar uma call com o time
      </a>
    </div>
  );
}
