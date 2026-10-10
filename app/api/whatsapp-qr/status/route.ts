import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { requireRole } from "@/lib/rbac";
import { qrStatus } from "@/lib/openwa/service";

export const dynamic = "force-dynamic";

// Polling da UI (a cada ~3 s enquanto o QR está no ecrã): estado da ligação e QR atual.
export async function GET() {
  try {
    const who = await requireRole(["OWNER", "MANAGER"]);
    const limited = await rateLimit(`wa-qr-status:${who.workspaceId}`, { limit: 300, windowMs: 10 * 60 * 1000 });
    if (!limited.ok) return NextResponse.json({ success: false, error: "rate_limited" }, { status: 429 });
    const result = await qrStatus(who.workspaceId);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.error === "none" ? 404 : 502 });
    return NextResponse.json({ success: true, state: result.state, qr: result.qr }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 });
  }
}
