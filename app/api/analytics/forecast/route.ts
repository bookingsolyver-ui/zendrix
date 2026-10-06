import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-auth";
import { PredictiveFinanceService } from "@/lib/finance/service";
import { fail, MANAGERS } from "@/lib/http/route";
import { requireRole } from "@/lib/rbac";
import { requireFeature } from "@/lib/superadmin/flags";

// Previsão de receita do próximo mês (Predictive CFO). Só OWNER e MANAGER: são números financeiros da empresa.
export async function GET(request: Request) {
  try {
    const who = await requireRole(MANAGERS, request);
    const off = await requireFeature(who.workspaceId, "ai_predictions");
    if (off) return off;
    return NextResponse.json({ success: true, forecast: await PredictiveFinanceService.forecast(who.workspaceId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    console.error("[api/analytics/forecast] falhou", err);
    return fail("internal", 500);
  }
}
