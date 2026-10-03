import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { MAX_BODY_BYTES, originAllowed, validateSubmission } from "@/lib/popups/schema";
import { captureLead, corsHeaders, json, loadPublicPopup, preflight } from "@/lib/popups/public";

// O visitante preencheu o popup. Rota pública (sem sessão), por isso: chave pública, domínios autorizados,
// limites por visitante e por popup, corpo pequeno, campo-armadilha anti-robôs e validação estrita. O contacto
// entra na organização do popup (nunca noutra) e dispara as automações de «Novo contacto» e «Popup preenchido».
export async function POST(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = (await params).key;
  const origin = request.headers.get("origin");
  const popup = await loadPublicPopup(key);
  if (!popup) return json({ success: false, error: "unavailable" }, 404, corsHeaders(origin, []));
  const cors = corsHeaders(origin, popup.config.allowedDomains);
  if (!originAllowed(origin, popup.config.allowedDomains)) return json({ success: false, error: "forbidden_origin" }, 403, cors);

  const ip = getClientIp(request);
  const [perVisitor, perPopup] = await Promise.all([
    rateLimit(`popup:submit:${key}:${ip}`, { limit: 5, windowMs: 3_600_000 }),
    rateLimit(`popup:submit:${key}`, { limit: 300, windowMs: 3_600_000 }),
  ]);
  if (!perVisitor.ok || !perPopup.ok) return json({ success: false, error: "rate_limited" }, 429, cors);

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ success: false, error: "invalid_input" }, 413, cors);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json({ success: false, error: "invalid_input" }, 400, cors);
  }

  // Campo-armadilha: um robô preenche-o, uma pessoa não vê. Responde "sucesso" para o robô não aprender nada.
  if (typeof raw === "object" && raw !== null && typeof (raw as Record<string, unknown>).website === "string" && (raw as Record<string, string>).website.trim() !== "") {
    return json({ success: true }, 200, cors);
  }

  const result = validateSubmission(raw, popup.config);
  if (!result.ok) return json({ success: false, error: result.error }, 400, cors);

  try {
    await captureLead({ popup, data: result.data });
  } catch (err) {
    console.error("[embed/submit] falhou", err);
    return json({ success: false, error: "internal" }, 500, cors);
  }
  return json({ success: true }, 200, cors);
}

export const OPTIONS = (request: Request) => preflight(request.headers.get("origin"));

