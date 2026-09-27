import { TenhaEmMaosPanel } from "@/components/whatsapp/tenha-em-maos-panel";
import { MobileWarning } from "@/components/whatsapp/mobile-warning";
import { ConnectButtons } from "@/components/whatsapp/connect-buttons";

export function DedicatedNumberSection() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <TenhaEmMaosPanel />
      <div className="space-y-4">
        <MobileWarning />
        <ConnectButtons />
      </div>
    </div>
  );
}
