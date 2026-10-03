import { FeatureGate } from "@/components/dashboard/feature-gate";

// O checkout de e-commerce ainda não está lançado: ver lib/features.ts.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <FeatureGate feature="ecommerce">{children}</FeatureGate>;
}
