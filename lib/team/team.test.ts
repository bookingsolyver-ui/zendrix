import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { canManageRole, grantableRoles, ROLE_LABEL } from "../roles.ts";
import { generateInviteToken, hashInviteToken, looksLikeInviteToken } from "./invite-token.ts";
import { parseSignedRequest } from "../meta/signed-request.ts";
import { buildSetupProgress } from "../onboarding/steps.ts";

test("equipa: quem gere quem (nunca um OWNER, nunca para cima)", () => {
  assert.ok(canManageRole("OWNER", "MANAGER") && canManageRole("OWNER", "STAFF"));
  assert.ok(canManageRole("MANAGER", "STAFF"));
  assert.ok(!canManageRole("MANAGER", "MANAGER") && !canManageRole("MANAGER", "OWNER"));
  assert.ok(!canManageRole("OWNER", "OWNER") && !canManageRole("STAFF", "STAFF"));
  assert.deepEqual(grantableRoles("STAFF"), []);
  assert.deepEqual(Object.values(ROLE_LABEL), ["Proprietário", "Gestor", "Agente"]);
});

test("convites: token com a forma certa, hash coerente e tokens distintos", () => {
  const a = generateInviteToken();
  const b = generateInviteToken();
  assert.ok(looksLikeInviteToken(a.token));
  assert.equal(a.hash, hashInviteToken(a.token));
  assert.equal(a.hash.length, 64);
  assert.notEqual(a.token, b.token);
  assert.ok(!a.token.includes(a.hash));
  for (const bad of ["", "curto", `${a.token}x`, a.token.slice(1), `${a.token.slice(0, -1)}!`]) {
    assert.equal(looksLikeInviteToken(bad), false, bad);
  }
});

const sign = (payload: object, secret: string, signatureOverride?: string) => {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signatureOverride ?? createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${signature}.${encoded}`;
};

test("Meta signed_request: só aceita o que foi assinado com o segredo da app", () => {
  const secret = "segredo-da-app";
  assert.deepEqual(parseSignedRequest(sign({ algorithm: "HMAC-SHA256", user_id: "123" }, secret), secret), { userId: "123" });
  // segredo errado, assinatura adulterada, algoritmo falso, lixo
  assert.equal(parseSignedRequest(sign({ algorithm: "HMAC-SHA256", user_id: "123" }, "outro"), secret), null);
  assert.equal(parseSignedRequest(sign({ algorithm: "HMAC-SHA256", user_id: "123" }, secret, "AAAA"), secret), null);
  assert.equal(parseSignedRequest(sign({ algorithm: "none", user_id: "123" }, secret), secret), null);
  assert.equal(parseSignedRequest(sign({ algorithm: "HMAC-SHA256" }, secret), secret), null);
  for (const bad of ["", "x", "a.b.c", ".", "a.", ".b"]) assert.equal(parseSignedRequest(bad, secret), null, bad);
  // um payload alterado depois de assinado não passa
  const [signature] = sign({ algorithm: "HMAC-SHA256", user_id: "123" }, secret).split(".");
  const forged = Buffer.from(JSON.stringify({ algorithm: "HMAC-SHA256", user_id: "999" })).toString("base64url");
  assert.equal(parseSignedRequest(`${signature}.${forged}`, secret), null);
});

test("onboarding: o caminho é canal -> ficha -> IA", () => {
  const none = buildSetupProgress({ channelConnected: false, profileComplete: false, agentOn: false });
  assert.equal(none.current, "channel");
  assert.equal(none.doneCount, 0);
  assert.deepEqual(none.steps.map((s) => s.id), ["channel", "profile", "agent"]);

  const half = buildSetupProgress({ channelConnected: true, profileComplete: false, agentOn: false });
  assert.equal(half.current, "profile");
  assert.equal(half.doneCount, 1);

  const all = buildSetupProgress({ channelConnected: true, profileComplete: true, agentOn: true });
  assert.equal(all.complete, true);
  assert.equal(all.current, null);
});
