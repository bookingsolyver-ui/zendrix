// Deteção de exportação em massa. Puro (sem servidor): testável.
export const PROFILE_LIMIT = 50; // perfis de clientes
export const PROFILE_WINDOW_MS = 60_000; // por minuto

export type AccessDecision = { allowed: true } | { allowed: false; reason: "limit_exceeded" };

// `count` é o total de perfis acedidos na janela, JÁ com os do pedido atual.
export const decideProfileAccess = (count: number, limit = PROFILE_LIMIT): AccessDecision => (count > limit ? { allowed: false, reason: "limit_exceeded" } : { allowed: true });

export const profileBucketKey = (workspaceId: string, userId: string) => `fortress:profiles:${workspaceId}:${userId}`;
