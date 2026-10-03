import "server-only";
import { AuthError, authenticateRequest, type Principal } from "@/lib/api-auth";
import type { Role } from "@/lib/roles";

// Controlo de acessos por papel. Uso:
//
//   // Route handler (aceita sessão e chave de API):
//   try {
//     const who = await requireRole(["OWNER", "MANAGER"], request);
//   } catch (err) {
//     return authErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
//   }
//
//   // Server Action (só sessão: não há Request):
//   const who = await requireRole(["OWNER"]);   // lança AuthError(401/403) se não puder
//
// Lança AuthError: 401 sem credenciais, 403 se o papel não está em `allowedRoles`.
export async function requireRole(
  allowedRoles: readonly Role[],
  request?: Request,
  options?: { allowApiKey?: boolean },
): Promise<Principal> {
  const principal = await authenticateRequest(request, options);
  if (!principal) throw new AuthError("unauthenticated", 401);
  if (!allowedRoles.includes(principal.role)) throw new AuthError("forbidden", 403);
  return principal;
}
