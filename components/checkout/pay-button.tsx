import { Lock } from "lucide-react";
import { SoonButton } from "@/components/ui/soon-button";

export function PayButton({ label }: { label: string }) {
  return (
    <div>
      <SoonButton feature={label}
        type="button"
        className="neon-green-btn w-full rounded-xl bg-green-500 py-4 text-base font-semibold text-background hover:bg-green-400"
      >
        {label}
      </SoonButton>

      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-neutral-500">
        <Lock className="h-3.5 w-3.5" />
        Pagamento 100% seguro e encriptado
      </p>
    </div>
  );
}
