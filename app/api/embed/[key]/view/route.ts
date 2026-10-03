import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { originAllowed } from "@/lib/popups/schema";
import { corsHeaders, json, loadPublicPopup, preflight } from "@/lib/popups/public";

// O visitante viu o popup: conta uma visualização. Limitado por visitante para o número não se inflacionar.
export async function POST(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = (await params).key;
  const origin = request.headers.get("origin");
  const popup = await loadPublicPopup(key);
  if (!popup) return json({ success: false, error: "unavailable" }, 404, corsHeaders(origin, []));
  const cors = corsHeaders(origin, popup.config.allowedDomains);
  if (!originAllowed(origin, popup.config.allowedDomains)) return json({ success: false, error: "forbidden_origin" }, 403, cors);

  const limit = await rateLimit(`popup:view:${key}:${getClientIp(request)}`, { limit: 20, windowMs: 60_000 });
  if (!limit.ok) return json({ success: false, error: "rate_limited" }, 429, cors);

  await prisma.popup.update({ where: { id: popup.id }, data: { views: { increment: 1 } } });
  return json({ success: true }, 200, cors);
}

export const OPTIONS = (request: Request) => preflight(request.headers.get("origin"));
