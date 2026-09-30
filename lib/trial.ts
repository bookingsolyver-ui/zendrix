// Puro (sem BD): pode ser importado em componentes.
// Milissegundos até `iso` (negativo se já passou); null sem data.
export function msUntil(
  iso: string | null,
  from: number = Date.now(),
): number | null {
  return iso ? new Date(iso).getTime() - from : null;
}
