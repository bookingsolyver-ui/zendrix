import assert from "node:assert/strict";
import test from "node:test";
import { maskEmail, noticeInputSchema } from "./notice-schema.ts";

const text = { subject: "Manutenção no sábado", body: "Vamos fazer uma intervenção técnica." };
const base = { mode: "send", kind: "notice", content: { pt: text } };

test("um aviso exige o texto em português; en e es são opcionais", () => {
  assert.ok(noticeInputSchema.safeParse(base).success);
  assert.ok(noticeInputSchema.safeParse({ ...base, content: { pt: text, en: text, es: text } }).success);
  assert.equal(noticeInputSchema.safeParse({ ...base, content: { en: text } }).success, false);
  assert.equal(noticeInputSchema.safeParse({ ...base, content: { pt: { subject: "x", body: "curto" } } }).success, false);
  assert.equal(noticeInputSchema.safeParse({ ...base, content: { pt: { subject: "Assunto", body: "x".repeat(5001) } } }).success, false);
});

test("a manutenção exige a data de início e o fim tem de vir depois", () => {
  assert.equal(noticeInputSchema.safeParse({ ...base, kind: "maintenance" }).success, false);
  assert.ok(noticeInputSchema.safeParse({ ...base, kind: "maintenance", startsAt: "2026-10-10T01:00:00.000Z" }).success);
  assert.ok(noticeInputSchema.safeParse({ ...base, kind: "maintenance", startsAt: "2026-10-10T01:00:00.000Z", endsAt: "2026-10-10T03:00:00.000Z" }).success);
  assert.equal(noticeInputSchema.safeParse({ ...base, kind: "maintenance", startsAt: "2026-10-10T03:00:00.000Z", endsAt: "2026-10-10T01:00:00.000Z" }).success, false);
});

test("modo e público têm valores conhecidos; o e-mail aparece mascarado", () => {
  assert.equal(noticeInputSchema.safeParse({ ...base, mode: "enviar" }).success, false);
  assert.equal(noticeInputSchema.safeParse({ ...base, audience: "toda_a_gente" }).success, false);
  assert.equal(noticeInputSchema.parse(base).audience, "all");
  assert.equal(maskEmail("ana.silva@exemplo.pt"), "a•••@exemplo.pt");
  assert.equal(maskEmail("sem-arroba"), "•••");
});

test("um aviso dirigido pode limitar-se a certas organizações", () => {
  assert.ok(noticeInputSchema.safeParse({ ...base, workspaceIds: ["org1", "org2"] }).success);
  assert.equal(noticeInputSchema.safeParse({ ...base, workspaceIds: [] }).success, false);
  assert.equal(noticeInputSchema.safeParse({ ...base, workspaceIds: Array.from({ length: 201 }, (_, i) => `o${i}`) }).success, false);
});
