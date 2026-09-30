import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import type { ConversationSummary } from "@/lib/inbox/types";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!me.workspace) return NextResponse.json({ error: "no_workspace" }, { status: 403 });

  try {
    const rows = await prisma.conversation.findMany({
      where: { workspaceId: me.workspace.id },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      select: {
        id: true,
        lastMessagePreview: true,
        lastMessageAt: true,
        unreadCount: true,
        isPaused: true,
        contact: { select: { name: true, waId: true } },
      },
    });

    const conversations: ConversationSummary[] = rows.map((row) => ({
      id: row.id,
      contactName: row.contact.name,
      waId: row.contact.waId,
      lastMessagePreview: row.lastMessagePreview,
      lastMessageAt: row.lastMessageAt.toISOString(),
      unreadCount: row.unreadCount,
      isPaused: row.isPaused,
    }));
    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("[inbox] listing conversations failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
