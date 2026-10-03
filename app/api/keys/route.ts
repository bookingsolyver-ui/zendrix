import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { generateApiKey } from "@/lib/api-keys";
import { isSameOrigin } from "@/lib/http/origin";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { requireRole } from "@/lib/rbac";
import { grantableRoles } from "@/lib/roles";
import { createApiKeySchema } from "@/lib/validations/api-keys";

const MAX_ACTIVE_KEYS = 20;

// Gestão das chaves de API da organização. Só com sessão (uma chave não cria chaves) e só OWNER/MANAGER.

export async function GET() {
  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    const keys = await prisma.apiKey.findMany({
      where: { workspaceId: who.workspaceId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, prefix: true, role: true, createdAt: true, lastUsedAt: true, expiresAt: true, revokedAt: true },
    });
    return NextResponse.json({ success: true, keys });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/keys] GET falhou", err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}

// Cria uma chave. A resposta traz a chave completa UMA vez: só o hash fica guardado.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });

  try {
    const who = await requireRole(["OWNER", "MANAGER"]);

    const limited = await rateLimit(`api-keys-create:${who.workspaceId}`, { limit: 10, windowMs: 60 * 60 * 1000 });
    if (!limited.ok) {
      return NextResponse.json(
        { success: false, error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
      );
    }

    const parsed = createApiKeySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, error: "invalid_input" }, { status: 400 });
    const { name, role, expiresInDays } = parsed.data;

    // Nunca se dá a uma chave mais poder do que o de quem a cria (um MANAGER só cria chaves STAFF).
    if (!grantableRoles(who.role).includes(role)) {
      return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
    }

    const active = await prisma.apiKey.count({
      where: {
        workspaceId: who.workspaceId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (active >= MAX_ACTIVE_KEYS) {
      return NextResponse.json({ success: false, error: "too_many_keys" }, { status: 409 });
    }

    const creator = who.userEmail
      ? await prisma.user.findUnique({ where: { email: who.userEmail }, select: { id: true } })
      : null;
    const generated = generateApiKey();
    const record = await prisma.apiKey.create({
      data: {
        workspaceId: who.workspaceId,
        name,
        prefix: generated.prefix,
        keyHash: generated.hash,
        role,
        createdById: creator?.id ?? null,
        expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000) : null,
      },
      select: { id: true, name: true, prefix: true, role: true, createdAt: true, expiresAt: true },
    });
    return NextResponse.json({ success: true, key: generated.key, apiKey: record }, { status: 201 });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/keys] POST falhou", err);
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}
