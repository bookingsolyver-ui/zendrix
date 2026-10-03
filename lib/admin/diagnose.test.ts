import assert from "node:assert/strict";
import test from "node:test";
import { diagnose, explainReason, type DiagnosticFacts } from "./diagnose.ts";

const NOW = new Date("2026-10-03T12:00:00Z");
const healthy = (): DiagnosticFacts => ({
  now: NOW,
  org: { subStatus: "active", trialEndsAt: null, approvalStatus: "APPROVED", approvalNote: null, blocked: false, blockedReason: null, hasStripeSubscription: true, periodEnd: new Date("2026-10-20T00:00:00Z"), cancelAtPeriodEnd: false, agentEnabled: true, hasKnowledge: true, hasConnectAccount: true, paymentItems: 1, createdAt: new Date("2026-08-01T00:00:00Z") },
  integrations: [{ platform: "WHATSAPP", status: "ACTIVE", tokenExpiresAt: null }],
  lastInboundAt: new Date("2026-10-03T10:00:00Z"),
  outbox: { pending: 0, oldestPendingAt: null, staleProcessing: 0, failed24h: {} },
  campaigns: { stuckSending: 0, skipped7d: {}, failed7d: {} },
  automations: { overdueSteps: 0, failed24h: {} },
  limits: [{ label: "automações", used: 3, max: 20, consequence: "Não pode criar mais." }],
  apiKeys: { active: 1, revoked: 0, neverUsed: 0 },
  platform: { missing: [] },
});
const ids = (f: DiagnosticFacts) => diagnose(f).map((x) => x.id);

test("uma organização saudável devolve um único «ok»", () => {
  const out = diagnose(healthy());
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, "ok");
});

test("trial terminado, pagamento falhado, cancelada e suspensa são críticos, com passo seguinte", () => {
  for (const [patch, id] of [[{ subStatus: "trialing", trialEndsAt: new Date("2026-09-30T00:00:00Z") }, "trial_expired"], [{ subStatus: "past_due" }, "past_due"], [{ subStatus: "canceled" }, "canceled"], [{ blocked: true, blockedReason: "Abuso" }, "blocked"]] as const) {
    const f = healthy();
    Object.assign(f.org, patch);
    const finding = diagnose(f).find((x) => x.id === id);
    assert.ok(finding, id);
    assert.equal(finding.severity, "critical");
    assert.ok(finding.meaning.length > 20 && finding.fix.length > 20, `${id} explica e sugere`);
  }
});

test("o teste a terminar em 3 dias é aviso; a conta por aprovar é assinalada", () => {
  const f = healthy();
  Object.assign(f.org, { subStatus: "trialing", trialEndsAt: new Date("2026-10-05T12:00:00Z") });
  assert.ok(ids(f).includes("trial_ending"));
  const g = healthy();
  g.org.approvalStatus = "PENDING_APPROVAL";
  assert.ok(ids(g).includes("pending_approval"));
});

test("renovação passada sem evento do Stripe: o webhook de faturação pode não estar a chegar", () => {
  const f = healthy();
  f.org.periodEnd = new Date("2026-09-25T00:00:00Z");
  assert.ok(ids(f).includes("billing_silent"));
  const ok = healthy();
  ok.org.periodEnd = new Date("2026-10-02T00:00:00Z"); // só 1 dia: ainda normal
  assert.ok(!ids(ok).includes("billing_silent"));
});

test("filas e crons parados: pendentes há mais de 15 min, campanhas e automações atrasadas", () => {
  const f = healthy();
  f.outbox = { pending: 4, oldestPendingAt: new Date("2026-10-03T11:30:00Z"), staleProcessing: 0, failed24h: {} };
  f.campaigns.stuckSending = 1;
  f.automations.overdueSteps = 3;
  const out = ids(f);
  assert.ok(out.includes("outbox_stuck") && out.includes("campaign_stuck") && out.includes("automation_overdue"));
  const fresh = healthy();
  fresh.outbox = { pending: 2, oldestPendingAt: new Date("2026-10-03T11:55:00Z"), staleProcessing: 0, failed24h: {} };
  assert.ok(!ids(fresh).includes("outbox_stuck"));
});

test("a janela de 24 h é explicada como regra da Meta, não como avaria", () => {
  const f = healthy();
  f.outbox.failed24h = { window_closed: 12 };
  f.campaigns.skipped7d = { window_closed: 40 };
  const w = diagnose(f).filter((x) => x.id === "outbox_window_closed" || x.id === "campaign_window");
  assert.equal(w.length, 2);
  assert.ok(w.every((x) => x.severity === "info" && /24 h/.test(x.meaning)));
});

test("os códigos de erro são traduzidos, incluindo os da Meta", () => {
  assert.equal(explainReason("token_expired").severity, "critical");
  assert.match(explainReason("token_expired").fix, /voltar a ligar o canal/);
  assert.match(explainReason("rate_or_outage_130429").meaning, /limitou o ritmo/);
  assert.match(explainReason("http_503").meaning, /falha temporária/);
  assert.equal(explainReason("meta_131048").severity, "critical");
  assert.match(explainReason("meta_100").meaning, /código 100/);
  assert.match(explainReason("algo_novo").meaning, /não reconhecido/);
});

test("canais: sem canal, canal expirado e token a expirar", () => {
  const none = healthy();
  none.integrations = [];
  assert.ok(ids(none).includes("no_channel"));
  const expired = healthy();
  expired.integrations = [{ platform: "WHATSAPP", status: "EXPIRED", tokenExpiresAt: null }];
  assert.ok(ids(expired).includes("integration_WHATSAPP"));
  const soon = healthy();
  soon.integrations = [{ platform: "INSTAGRAM", status: "ACTIVE", tokenExpiresAt: new Date("2026-10-08T00:00:00Z") }];
  assert.equal(diagnose(soon).find((x) => x.id === "token_INSTAGRAM")?.severity, "warning");
});

test("limites do plano: atingido é aviso, perto é informação", () => {
  const f = healthy();
  f.limits = [{ label: "popups", used: 10, max: 10, consequence: "Não pode criar mais popups." }, { label: "segmentos", used: 46, max: 50, consequence: "…" }, { label: "tarefas", used: 5, max: 500, consequence: "…" }];
  const out = diagnose(f);
  assert.equal(out.find((x) => x.id === "limit_popups")?.severity, "warning");
  assert.equal(out.find((x) => x.id === "limit_segmentos")?.severity, "info");
  assert.ok(!out.some((x) => x.id === "limit_tarefas"));
});

test("IA sem ficha, Stripe por ligar e chaves de API nunca usadas", () => {
  const f = healthy();
  f.org.hasKnowledge = false;
  f.org.hasConnectAccount = false;
  f.apiKeys = { active: 2, revoked: 0, neverUsed: 2 };
  const out = ids(f);
  assert.ok(out.includes("agent_no_knowledge") && out.includes("connect_missing") && out.includes("api_unused"));
});

test("problemas do servidor aparecem como críticos e a lista vem ordenada por gravidade", () => {
  const f = healthy();
  f.platform.missing = [{ label: "STRIPE_WEBHOOK_SECRET", consequence: "Os webhooks de faturação não se podem verificar." }];
  f.org.subStatus = "canceled";
  f.outbox.failed24h = { window_closed: 1 };
  const out = diagnose(f);
  assert.ok(out.some((x) => x.id === "platform_STRIPE_WEBHOOK_SECRET" && x.severity === "critical"));
  const order = ["critical", "warning", "info", "ok"];
  assert.deepEqual(out.map((x) => order.indexOf(x.severity)), [...out.map((x) => order.indexOf(x.severity))].sort((a, b) => a - b));
});
