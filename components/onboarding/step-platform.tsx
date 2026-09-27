import {
  Boxes,
  CircleSlash2,
  Cloud,
  Layers,
  LayoutGrid,
  MoreHorizontal,
  Package,
  PawPrint,
  ShoppingBag,
  ShoppingCart,
  Store,
} from "lucide-react";
import { SelectableCard } from "@/components/onboarding/selectable-card";

const PLATFORMS = [
  { value: "shopify", label: "Shopify", icon: ShoppingBag },
  { value: "yampi", label: "Yampi", icon: ShoppingCart },
  { value: "nuvemshop", label: "Nuvemshop", icon: Cloud },
  { value: "woocommerce", label: "WooCommerce", icon: Store },
  { value: "vtex", label: "VTEX", icon: Layers },
  { value: "loja-integrada", label: "Loja Integrada", icon: LayoutGrid },
  { value: "cartpanda", label: "Cartpanda", icon: PawPrint },
  { value: "tray", label: "Tray", icon: Package },
  { value: "bagy", label: "Bagy", icon: Boxes },
  { value: "outra", label: "Outra plataforma", icon: MoreHorizontal },
  { value: "nenhuma", label: "Ainda não tenho loja", icon: CircleSlash2 },
];

export function StepPlatform({
  value,
  onSelect,
}: {
  value: string | null;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Em qual plataforma está a sua loja?
      </h1>
      <p className="mt-2 text-sm text-muted">
        Vamos preparar as integrações certas para o seu negócio.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PLATFORMS.map((platform) => (
          <SelectableCard
            key={platform.value}
            icon={platform.icon}
            label={platform.label}
            selected={value === platform.value}
            onClick={() => onSelect(platform.value)}
          />
        ))}
      </div>
    </div>
  );
}
