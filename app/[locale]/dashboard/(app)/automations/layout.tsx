import { FeatureGate } from "@/components/dashboard/feature-gate";

// Módulo ainda não lançado: ver lib/features.ts.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeatureGate feature="automationsBuilder">{children}</FeatureGate>;
}
