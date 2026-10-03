import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { AuthError } from "@/lib/api-auth";
import { getAccess } from "@/lib/billing/access";
import { backToSettings } from "@/lib/http/settings-redirect";
import { statesMatch } from "@/lib/meta/oauth-state";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { exchangeConnectCode } from "@/lib/stripe/connect";

// Regresso do Stripe: ?code=...&state=... (ou ?error=access_denied). Troca o code pelo id da conta ligada e
// guarda-o na organização DA SESSÃO. O state é de uso único (consome-se em qualquer desfecho).
const STATE_COOKIE = "stripe_connect_state";

export async function GET(request: Request) {
  const jar = await cookies();
  const [savedState, savedLocale] = (jar.get(STATE_COOKIE)?.value ?? "").split(".");
  const done = (params: Record<string, string>) => {
    const response = backToSettings(request, savedLocale, "sales", params);
    response.cookies.set(STATE_COOKIE, "", { path: "/api/stripe/connect", maxAge: 0 });
    return response;
  };

  const query = new URL(request.url).searchParams;
  if (query.get("error")) return done({ error: "denied" });
  const code = query.get("code");
  const state = query.get("state");
  if (!savedState || !code || !state || code.length > 512 || !statesMatch(state, savedState)) return done({ error: "invalid_state" });

  let workspaceId: string;
  try {
    ({ workspaceId } = await requireRole(["OWNER", "MANAGER"]));
  } catch (err) {
    if (err instanceof AuthError) return done({ error: err.status === 401 ? "session_expired" : "forbidden" });
    return done({ error: "server_error" });
  }
  if (!(await getAccess(workspaceId)).active) return done({ error: "subscription_required" });

  try {
    const accountId = await exchangeConnectCode(code);
    await prisma.workspace.update({ where: { id: workspaceId }, data: { stripeConnectAccountId: accountId } });
    return done({ connected: "1" });
  } catch (err) {
    // Uma conta Stripe só pode estar ligada a UMA organização.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return done({ error: "conflict" });
    console.error("[stripe/connect/callback] falhou", err instanceof Error ? err.name : "unknown");
    return done({ error: "stripe_error" });
  }
}
