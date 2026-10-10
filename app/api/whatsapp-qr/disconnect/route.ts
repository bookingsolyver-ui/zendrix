import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { isSameOrigin } from "@/lib/http/origin";
import { requireRole } from "@/lib/rbac";
import { disconnectQr } from "@/lib/openwa/service";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ success: false, error: "forbidden_origin" }, { status: 403 });
  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    const ok = await disconnectQr(who.workspaceId);
    return NextResponse.json({ success: ok, ...(ok ? {} : { error: "openwa_error" }) }, { status: ok ? 200 : 502 });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}
