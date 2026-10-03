import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAccess, subscriptionRequiredResponse } from "@/lib/billing/access";
import { prisma } from "@/lib/prisma";
import type { ChatMessage } from "@/lib/inbox/types";
import { signedMediaUrls } from "@/lib/storage/media";

async function authorize(id: string) {
  const me = await getCurrentUser();
  if (!me) return { error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  if (!me.workspace) return { error: NextResponse.json({ error: "no_workspace" }, { status: 403 }) };
  // PAYWALL: ler e gerir conversas exige plano ativo (a página já redireciona; isto fecha a API).
  if (!(await getAccess(me.workspace.id)).active) return { error: subscriptionRequiredResponse() };

  // The workspace filter is what stops one workspace reading another's conversations.
  const conversation = await prisma.conversation.findFirst({
    where: { id, workspaceId: me.workspace.id },
    select: { id: true, isPaused: true, contact: { select: { name: true, waId: true } } },
  });
  if (!conversation) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  return { conversation, workspaceId: me.workspace.id };
}

// Messages of one conversation, oldest first.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await authorize(id);
    if (auth.error) return auth.error;

    const rows = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        direction: true,
        type: true,
        body: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        mediaPath: true,
      },
    });

    // URLs assinados só para os áudios desta conversa (e só do workspace de quem pede).
    const paths = rows.flatMap((row) => (row.mediaPath ? [row.mediaPath] : []));
    const urls = await signedMediaUrls(auth.workspaceId, paths);

    const messages: ChatMessage[] = rows.reverse().map((row) => ({
      id: row.id,
      direction: row.direction === "OUT" ? "OUT" : "IN",
      type: row.type,
      body: row.body,
      status: row.status,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
      mediaUrl: row.mediaPath ? (urls[row.mediaPath] ?? null) : null,
    }));
    return NextResponse.json({
      contact: auth.conversation.contact,
      isPaused: auth.conversation.isPaused,
      messages,
    });
  } catch (err) {
    console.error("[inbox] loading messages failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// PATCH with { "paused": true | false }: a human takes over (or hands back to the AI agent).
// PATCH with no body: marks the conversation as read (clears the unread badge).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await authorize(id);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => null);
    if (typeof body?.paused === "boolean") {
      await prisma.conversation.update({ where: { id }, data: { isPaused: body.paused } });
      return NextResponse.json({ success: true, isPaused: body.paused });
    }

    await prisma.conversation.update({ where: { id }, data: { unreadCount: 0 } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[inbox] marking read failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
