import { notFound } from "next/navigation";
import { isFeatureEnabled, type FeatureId } from "@/lib/features";

// Para as rotas de um módulo ainda não lançado: 404, como se não existisse. Usa-se num layout.tsx da pasta do
// módulo (ver lib/features.ts). O menu esconde as ligações; isto fecha também o acesso direto por URL.
export function FeatureGate({ feature, children }: { feature: FeatureId; children: React.ReactNode }) {
  if (!isFeatureEnabled(feature)) notFound();
  return <>{children}</>;
}
