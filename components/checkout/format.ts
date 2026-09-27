export function withThousands(amount: number): string {
  return Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatKz(amount: number, withDecimals = true): string {
  return withDecimals ? `Kz ${withThousands(amount)},00` : `Kz ${withThousands(amount)}`;
}
