// Só caminhos relativos do próprio site: impede que um `?next=` seja usado como redirecionamento aberto.
export function safeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
