import test from "node:test";
import assert from "node:assert/strict";
import {
  decideOrphan,
  isManagedSessionName,
  isStale,
  nameBelongsToTenant,
  ORPHAN_GRACE_MS,
  tenantHash,
  tenantSessionName,
} from "./tenant-session.ts";

test("o nome da sessão é válido para o OpenWA e único por geração", () => {
  const a = tenantSessionName("ws_1");
  const b = tenantSessionName("ws_1");
  assert.notEqual(a, b); // nonce novo: nunca colide com um teardown em curso
  assert.match(a, /^[a-z0-9-]{3,50}$/);
  assert.ok(isManagedSessionName(a));
});

test("tenants com ids que só diferem no fim não partilham hash (o slice antigo de 28 juntava-os)", () => {
  const base = "clx1234567890abcdefghijklmnopq";
  assert.notEqual(tenantHash(`${base}A`), tenantHash(`${base}B`));
  assert.equal(
    nameBelongsToTenant(tenantSessionName(`${base}A`, "deadbeef"), `${base}A`),
    true,
  );
  assert.equal(
    nameBelongsToTenant(tenantSessionName(`${base}A`, "deadbeef"), `${base}B`),
    false,
  );
});

test("só sessões com o nosso formato são geridas (as kf- antigas e as de outros sistemas ficam em paz)", () => {
  assert.equal(isManagedSessionName("kf-abc123"), false);
  assert.equal(isManagedSessionName("my-bot"), false);
  assert.equal(isManagedSessionName(null), false);
});

test("limpeza: nunca apaga uma sessão ligada, com dono, recente ou que não é nossa", () => {
  const now = Date.parse("2026-10-11T12:00:00Z");
  const old = new Date(now - ORPHAN_GRACE_MS - 60_000).toISOString();
  const recent = new Date(now - 60_000).toISOString();
  const name = tenantSessionName("ws_1", "cafe0001");
  assert.equal(
    decideOrphan({
      name,
      status: "failed",
      createdAt: old,
      knownInDb: false,
      now,
    }),
    "delete",
  );
  assert.equal(
    decideOrphan({
      name,
      status: "qr_ready",
      createdAt: old,
      knownInDb: false,
      now,
    }),
    "delete",
  );
  assert.equal(
    decideOrphan({
      name,
      status: "ready",
      createdAt: old,
      knownInDb: false,
      now,
    }),
    "keep",
  );
  assert.equal(
    decideOrphan({
      name,
      status: "authenticating",
      createdAt: old,
      knownInDb: false,
      now,
    }),
    "keep",
  );
  assert.equal(
    decideOrphan({
      name,
      status: "failed",
      createdAt: recent,
      knownInDb: false,
      now,
    }),
    "keep",
  );
  assert.equal(
    decideOrphan({
      name,
      status: "failed",
      createdAt: old,
      knownInDb: true,
      now,
    }),
    "keep",
  );
  assert.equal(
    decideOrphan({
      name: "kf-old",
      status: "failed",
      createdAt: old,
      knownInDb: false,
      now,
    }),
    "keep",
  );
  assert.equal(
    decideOrphan({
      name,
      status: "failed",
      createdAt: null,
      knownInDb: false,
      now,
    }),
    "keep",
  );
});

test("isStale", () => {
  const now = 1_000_000;
  assert.equal(isStale(new Date(now - 11_000), 10_000, now), true);
  assert.equal(isStale(new Date(now - 9_000), 10_000, now), false);
  assert.equal(isStale(null, 10_000, now), false);
});
