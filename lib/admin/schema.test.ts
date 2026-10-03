import assert from "node:assert/strict";
import test from "node:test";
import { adminActionSchema, extendedTrialEnd, maskPhone, monthlyRevenueMinor, parseOrgListQuery, shortId } from "./schema.ts";

test("parâmetros da lista: página, pesquisa e estado são sempre válidos", () => {
  assert.deepEqual(parseOrgListQuery({}), { page: 1, q: "", status: "all" });
  assert.deepEqual(parseOrgListQuery({ page: "3", q: "  loja ", status: "blocked" }), { page: 3, q: "loja", status: "blocked" });
  assert.equal(parseOrgListQuery({ page: "-5" }).page, 1);
  assert.equal(parseOrgListQuery({ page: "abc" }).page, 1);
  assert.equal(parseOrgListQuery({ status: "'; drop table" }).status, "all");
  assert.equal(parseOrgListQuery({ q: "x".repeat(500) }).q.length, 80);
});

test("ações administrativas: bloquear exige um motivo; o estado tem de ser conhecido", () => {
  assert.ok(adminActionSchema.safeParse({ action: "block", reason: "Abuso de envio" }).success);
  assert.equal(adminActionSchema.safeParse({ action: "block", reason: "" }).success, false);
  assert.equal(adminActionSchema.safeParse({ action: "block" }).success, false);
  assert.ok(adminActionSchema.safeParse({ action: "unblock" }).success);
  assert.equal(adminActionSchema.safeParse({ action: "set_subscription", subStatus: "gratis" }).success, false);
  assert.equal(adminActionSchema.safeParse({ action: "set_subscription", subStatus: "trialing", trialDays: 365 }).success, false);
  const ok = adminActionSchema.safeParse({ action: "set_subscription", subStatus: "active", plan: " Pro " });
  assert.ok(ok.success && ok.data.action === "set_subscription" && ok.data.plan === "Pro");
  assert.equal(adminActionSchema.safeParse({ action: "extend_trial", days: 0 }).success, false);
  assert.equal(adminActionSchema.safeParse({ action: "apagar_tudo" }).success, false);
});

test("o telemóvel e os ids aparecem truncados", () => {
  assert.equal(maskPhone("351912345678"), "+••••••••678");
  assert.equal(maskPhone("12"), "•••");
  assert.ok(!maskPhone("351912345678").includes("9123"));
  assert.equal(shortId("cus_1234567890abcdef"), "cus_…abcdef");
  assert.equal(shortId(null), "—");
});

test("receita mensal estimada converte o intervalo para um mês", () => {
  assert.equal(monthlyRevenueMinor(10, 2990, "month"), 29_900);
  assert.equal(monthlyRevenueMinor(2, 24_000, "year"), 4_000);
  assert.equal(monthlyRevenueMinor(0, 2990, "month"), 0);
  assert.equal(monthlyRevenueMinor(5, 2990, "forever"), 0);
});

test("prolongar o teste soma ao que resta, ou a hoje se já acabou", () => {
  const now = new Date("2026-10-03T12:00:00Z");
  assert.equal(extendedTrialEnd(new Date("2026-10-10T12:00:00Z"), 7, now).toISOString(), "2026-10-17T12:00:00.000Z");
  assert.equal(extendedTrialEnd(new Date("2026-09-01T12:00:00Z"), 7, now).toISOString(), "2026-10-10T12:00:00.000Z");
  assert.equal(extendedTrialEnd(null, 3, now).toISOString(), "2026-10-06T12:00:00.000Z");
});

test("novas ações: ativar/suspender subscrição, aprovar, rejeitar e sincronizar", () => {
  assert.ok(adminActionSchema.safeParse({ action: "activate_subscription" }).success);
  assert.ok(adminActionSchema.safeParse({ action: "suspend_subscription" }).success);
  const approve = adminActionSchema.safeParse({ action: "approve" });
  assert.ok(approve.success && approve.data.action === "approve" && approve.data.notify === false);
  assert.ok(adminActionSchema.safeParse({ action: "approve", notify: true }).success);
  assert.equal(adminActionSchema.safeParse({ action: "reject" }).success, false);
  assert.equal(adminActionSchema.safeParse({ action: "reject", reason: "x" }).success, false);
  assert.ok(adminActionSchema.safeParse({ action: "reject", reason: "Não é uma empresa real" }).success);
  assert.ok(adminActionSchema.safeParse({ action: "sync_stripe" }).success);
  assert.equal(parseOrgListQuery({ status: "pending" }).status, "pending");
  assert.equal(parseOrgListQuery({ status: "rejected" }).status, "rejected");
});
