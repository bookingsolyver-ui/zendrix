export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

export const STORE_NAME = "Loja Aurora";

export const ORDER_ITEMS: OrderItem[] = [
  { id: "item-1", name: "Curso de Vendas Avançado", qty: 1, price: 35000 },
  { id: "item-2", name: "E-book Bónus: Guia de Fecho", qty: 1, price: 8000 },
];

export const PROCESSING_FEE = 2000;

export const SUBTOTAL = ORDER_ITEMS.reduce((sum, item) => sum + item.price * item.qty, 0);
export const TOTAL = SUBTOTAL + PROCESSING_FEE;
