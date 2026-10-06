import assert from "node:assert/strict";
import test from "node:test";
import { alertText, classifyError, fingerprint, safeRoute, scrubMessage, webhookBody } from "./classify.ts";
import { resolveFlag, isKnownFlag } from "./catalog.ts";
import { isChurnRisk } from "./churn.ts";
import { dailyLimit, dayKey, isOverQuota } from "./quota-rules.ts";

test("flags: sem linha está ligado; a torneira (*) desligada manda sobre tudo", () => {
  assert.equal(resolveFlag([], "ai_agent"), true);
  assert.equal(resolveFlag([{ flag: "ai_agent", enabled: false }], "ai_agent"), false);
  assert.equal(resolveFlag([{ flag: "ai_agent", enabled: false }], "portal"), true);
  assert.equal(resolveFlag([{ flag: "*", enabled: false }, { flag: "portal", enabled: true }], "portal"), false);
  assert.equal(resolveFlag([{ flag: "*", enabled: true }], "portal"), true);
  assert.equal(isKnownFlag("inventada"), false);
  assert.equal(isKnownFlag("*"), true);
});

test("churn: 7 dias sem entrar, mas não para contas novas, bloqueadas ou canceladas", () => {
  const now = new Date("2026-10-20T12:00:00Z");
  const base = { lastLogin: new Date("2026-10-10T12:00:00Z"), createdAt: new Date("2026-08-01T00:00:00Z"), subStatus: "active", blocked: false };
  assert.equal(isChurnRisk(base, now), true);
  assert.equal(isChurnRisk({ ...base, lastLogin: new Date("2026-10-18T12:00:00Z") }, now), false);
  assert.equal(isChurnRisk({ ...base, lastLogin: null }, now), true);
  assert.equal(isChurnRisk({ ...base, createdAt: new Date("2026-10-18T00:00:00Z"), lastLogin: null }, now), false);
  assert.equal(isChurnRisk({ ...base, subStatus: "canceled" }, now), false);
  assert.equal(isChurnRisk({ ...base, blocked: true }, now), false);
});

test("erros: timeout, base de dados, Meta/OpenAI, 401 e o resto", () => {
  const timeout = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
  assert.equal(classifyError(timeout).kind, "upstream_timeout");
  assert.equal(classifyError(Object.assign(new Error("x"), { code: "P1001" })).kind, "db_error");
  assert.equal(classifyError(new Error("fetch failed")).kind, "upstream_error");
  assert.equal(classifyError(null, 401).kind, "unauthorized");
  assert.equal(classifyError(new Error("boom"), 500).kind, "server_error");
});

test("a impressão digital ignora ids e números; segredos e queries saem das mensagens e rotas", () => {
  assert.equal(fingerprint("/api/x", "server_error", "Row 12345 not found for abcdef0123456789"), fingerprint("/api/x", "server_error", "Row 99 not found for 0123456789abcdef"));
  assert.doesNotMatch(scrubMessage("falhou com Bearer abc.def.ghi e postgres://u:p@h/db?key=zzz"), /abc\.def|u:p@/);
  assert.equal(safeRoute("/api/portal/approve?token=SEGREDO"), "/api/portal/approve");
  assert.equal(safeRoute("/api/proposals/ckx1234567890abcdefghij/link"), "/api/proposals/:id/link");
});

test("quota: limite próprio > variável > 500; passa até ao limite inclusive", () => {
  assert.equal(dailyLimit(undefined, undefined), 500);
  assert.equal(dailyLimit(undefined, "120"), 120);
  assert.equal(dailyLimit(2000, "120"), 2000);
  assert.equal(dailyLimit(undefined, "abc"), 500);
  assert.equal(isOverQuota(500, 500), false);
  assert.equal(isOverQuota(501, 500), true);
  assert.equal(dayKey(new Date("2026-10-20T23:59:59Z")), "2026-10-20");
});

test("o alerta tem o formato pedido e o corpo certo para Discord e Slack", () => {
  const text = alertText({ severity: "critical", workspaceId: "ws1", workspaceName: "Acme", status: 500, route: "/api/x", kind: "server_error", message: "boom" });
  assert.equal(text, "🚨 CRITICAL: Tenant ws1 (Acme) experienciou Erro 500 na Rota /api/x. Detalhe: boom");
  assert.match(alertText({ severity: "critical", workspaceId: null, route: "/r", kind: "db_error", message: "m" }), /Plataforma experienciou db_error/);
  assert.deepEqual(JSON.parse(webhookBody("https://discord.com/api/webhooks/1/x", "t")), { content: "t" });
  assert.deepEqual(JSON.parse(webhookBody("https://hooks.slack.com/services/T/B/x", "t")), { text: "t" });
});
