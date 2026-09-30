import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export interface CurrentUser {
  authId: string;
  email: string;
  name: string | null;
  workspace: {
    id: string;
    name: string;
    subStatus: string;
    trialEndsAt: string | null; // ISO
    plan: string | null;
  } | null;
}

// Real identity of the signed-in user: session from Supabase (verified server-side),
// profile and workspace from our own database. Cached per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const metaName =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : null;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: {
        email: true,
        name: true,
        workspace: {
          select: {
            id: true,
            name: true,
            subStatus: true,
            trialEndsAt: true,
            plan: true,
          },
        },
      },
    });
    if (dbUser) {
      return {
        authId: user.id,
        email: dbUser.email,
        name: dbUser.name ?? metaName,
        workspace: {
          id: dbUser.workspace.id,
          name: dbUser.workspace.name,
          subStatus: dbUser.workspace.subStatus,
          trialEndsAt: dbUser.workspace.trialEndsAt?.toISOString() ?? null,
          plan: dbUser.workspace.plan,
        },
      };
    }
  } catch (err) {
    console.error(
      "[current-user] database lookup failed, using session data",
      err,
    );
  }

  return {
    authId: user.id,
    email: user.email ?? "",
    name: metaName,
    workspace: null,
  };
});
