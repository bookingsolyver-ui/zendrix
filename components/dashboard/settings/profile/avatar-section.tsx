import { Camera } from "lucide-react";
import { SoonButton } from "@/components/ui/soon-button";

export function AvatarSection({ initials }: { initials: string }) {
  return (
    <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-6">
      <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-2 text-2xl font-semibold text-background">
        {initials}
      </span>

      <div>
        <p className="text-sm font-medium text-white">Fotografia de perfil</p>
        <p className="mt-1 text-xs text-white/40">PNG ou JPG, até 5MB.</p>

        <SoonButton feature="Alterar Fotografia"
          type="button"
          className="mt-3 flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white/30 hover:bg-white/[0.03]"
        >
          <Camera className="h-4 w-4" />
          Alterar Fotografia
        </SoonButton>
      </div>
    </div>
  );
}
