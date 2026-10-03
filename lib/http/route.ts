import "server-only";
import { NextResponse } from "next/server";
import { authErrorResponse, type Principal } from "@/lib/api-auth";
import { isSameOrigin } from "@/lib/http/origin";
import { requireRole } from "@/lib/rbac";
import type { Role } from "@/lib/roles";

export const ALL_ROLES: readonly Role[] = ["OWNER", "MANAGER", "STAFF"];
export const MANAGERS: readonly Role[] = ["OWNER", "MANAGER"];

export const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });
export const ok = (extra: Record<string, unknown> = {}, status = 200) => NextResponse.json({ success: true, ...extra }, { status });

// Envolve um route handler que muda dados: confirma a origem, a sessão e o papel, e trata os erros de forma uniforme.
export async function guarded(
  request: Request,
  roles: readonly Role[],
  label: string,
  handler: (who: Principal) => Promise<NextResponse>,
): Promise<NextResponse> {
  if (!isSameOrigin(request)) return fail("forbidden_origin", 403);
  try {
    return await handler(await requireRole(roles));
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error(`[api/${label}] falhou`, err);
    return fail("internal", 500);
  }
}
