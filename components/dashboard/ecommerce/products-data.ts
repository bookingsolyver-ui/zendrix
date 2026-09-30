export type Product = {
  id: string;
  name: string;
  priceKz: string;
  priceEur: string;
  priceUsd: string;
  sales: number;
  active: boolean;
};

export const INITIAL_PRODUCTS: Product[] = [];
