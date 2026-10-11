import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, guarded, MANAGERS, ok } from "@/lib/http/route";
import { requireRole } from "@/lib/rbac";
import { authErrorResponse } from "@/lib/api-auth";
import { loadBankDetails, saveBankDetails } from "@/lib/payments/bank";
import { groupIban, validateBank } from "@/lib/payments/bank-format";
import { AuditLedger } from "@/lib/audit/ledger";
import { getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  bankName: z.string().trim().max(80),
  holderName: z.string().trim().max(120),
  iban: z.string().trim().max(60),
  nib: z.string().trim().max(40).nullish(),
  instructions: z.string().trim().max(300).nullish(),
});

// Dados bancários que o agente envia aos clientes. Só proprietários e gestores (são coordenadas de pagamento).
export async function GET() {
  try {
    const who = await requireRole(MANAGERS);
    const bank = await loadBankDetails(who.workspaceId);
    return ok({ bank: bank ? { bankName: bank.bankName, holderName: bank.holderName, iban: groupIban(bank.iban), nib: bank.nib, instructions: bank.instructions } : null });
  } catch (err) {
    const response = authErrorResponse(err);
    if (response) return response;
    throw err;
  }
}

export async function PUT(request: Request) {
  return guarded(request, MANAGERS, "payments/bank-details", async (who) => {
    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail("invalid_input", 400);
    const issues = validateBank(body.data);
    if (issues.length > 0) return NextResponse.json({ success: false, error: "invalid_fields", fields: issues }, { status: 400 });

    const previous = await loadBankDetails(who.workspaceId);
    const saved = await saveBankDetails(who.workspaceId, body.data);
    // Mudar para onde vai o dinheiro é uma ação sensível: fica no livro de auditoria (síncrono).
    await AuditLedger.record(
      { workspaceId: who.workspaceId, actorId: who.userEmail ?? null, ip: getClientIp(request) },
      { entityType: "BankDetails", entityId: saved.id, action: previous ? "UPDATE" : "CREATE" },
      { previous: previous ? { bankName: previous.bankName, holderName: previous.holderName, iban: previous.iban } : undefined, next: { bankName: saved.bankName, holderName: saved.holderName, iban: saved.iban } },
      "sync",
    );
    return ok();
  });
}
