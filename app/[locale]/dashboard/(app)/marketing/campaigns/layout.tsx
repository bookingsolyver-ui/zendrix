import { FeatureGate } from "@/components/dashboard/feature-gate";

// Módulo ainda sem motor de execução: escondido (ver lib/features.ts).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeatureGate feature="campaigns">{children}</FeatureGate>;
}
