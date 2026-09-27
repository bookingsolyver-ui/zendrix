export type TagName = "VIP" | "Frio" | "Afiliado";

export type Contact = {
  id: string;
  name: string;
  phone: string;
  ltv: string;
  tags: TagName[];
  registeredAt: string;
};

export const CONTACTS: Contact[] = [
  {
    id: "contact-1",
    name: "Ana Martins",
    phone: "+244 923 456 789",
    ltv: "Kz 480.000",
    tags: ["VIP"],
    registeredAt: "12 Jan 2025",
  },
  {
    id: "contact-2",
    name: "João Costa",
    phone: "+244 912 345 678",
    ltv: "Kz 25.000",
    tags: ["Frio"],
    registeredAt: "03 Mar 2025",
  },
  {
    id: "contact-3",
    name: "Marta Silva",
    phone: "+244 934 567 890",
    ltv: "Kz 150.000",
    tags: ["Afiliado"],
    registeredAt: "20 Jun 2025",
  },
  {
    id: "contact-4",
    name: "Óscar Lopes",
    phone: "+244 945 678 901",
    ltv: "Kz 780.000",
    tags: ["VIP", "Afiliado"],
    registeredAt: "08 Fev 2025",
  },
  {
    id: "contact-5",
    name: "Carla Neto",
    phone: "+244 956 789 012",
    ltv: "Kz 0",
    tags: ["Frio"],
    registeredAt: "15 Set 2025",
  },
];
