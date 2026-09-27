import {
  Briefcase,
  Cpu,
  GraduationCap,
  HeartPulse,
  MapPin,
  MoreHorizontal,
  Rocket,
  ShoppingCart,
} from "lucide-react";
import { SelectableCard } from "@/components/onboarding/selectable-card";

const BUSINESS_TYPES = [
  { value: "ecommerce", label: "E-commerce", icon: ShoppingCart },
  { value: "saude", label: "Saúde", icon: HeartPulse },
  { value: "educacao", label: "Educação", icon: GraduationCap },
  { value: "servicos", label: "Serviços", icon: Briefcase },
  { value: "infoprodutos", label: "Infoprodutos", icon: Rocket },
  { value: "servicos-locais", label: "Serviços locais", icon: MapPin },
  { value: "tecnologia", label: "Tecnologia", icon: Cpu },
  { value: "outro", label: "Outro", icon: MoreHorizontal },
];

export function StepBusinessType({
  value,
  onSelect,
}: {
  value: string | null;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Qual é o seu tipo de negócio?
      </h1>
      <p className="mt-2 text-sm text-muted">
        Isto ajuda-nos a personalizar a sua experiência na Zentrix.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BUSINESS_TYPES.map((type) => (
          <SelectableCard
            key={type.value}
            icon={type.icon}
            label={type.label}
            selected={value === type.value}
            onClick={() => onSelect(type.value)}
          />
        ))}
      </div>
    </div>
  );
}
