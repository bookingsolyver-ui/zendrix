export type Product = {
  id: string;
  name: string;
  priceKz: string;
  priceEur: string;
  priceUsd: string;
  sales: number;
  active: boolean;
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Curso de Vendas Avançado",
    priceKz: "45.000",
    priceEur: "45",
    priceUsd: "49",
    sales: 128,
    active: true,
  },
  {
    id: "prod-2",
    name: "Mentoria 1:1 — Growth Zentrix",
    priceKz: "150.000",
    priceEur: "150",
    priceUsd: "165",
    sales: 12,
    active: true,
  },
  {
    id: "prod-3",
    name: "Template Premium — Landing Pages",
    priceKz: "12.000",
    priceEur: "12",
    priceUsd: "13",
    sales: 340,
    active: false,
  },
];
