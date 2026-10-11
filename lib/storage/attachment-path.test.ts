import test from "node:test";
import assert from "node:assert/strict";
import {
  attachmentPath,
  categoryFor,
  extensionFor,
  safeNameSegment,
} from "./attachment-path.ts";

test("safeNameSegment: acentos e símbolos viram _, nunca separadores de pasta", () => {
  assert.equal(safeNameSegment("João da Silva"), "Joao_da_Silva");
  assert.equal(safeNameSegment("  Ana-Maria / O'Neil  "), "Ana_Maria_O_Neil");
  assert.equal(safeNameSegment("../../etc/passwd"), "etc_passwd");
  assert.equal(safeNameSegment(""), "cliente");
  assert.equal(safeNameSegment(null, "x"), "x");
  assert.ok(safeNameSegment("a".repeat(100)).length <= 40);
});

test("categoryFor e extensionFor", () => {
  assert.equal(categoryFor(true), "comprovativos");
  assert.equal(categoryFor(false), "anexos_gerais");
  assert.equal(extensionFor("application/pdf"), "pdf");
  assert.equal(extensionFor("image/jpeg; charset=binary"), "jpg");
  assert.equal(extensionFor("application/x-desconhecido"), "bin");
  assert.equal(extensionFor(null), "bin");
});

test("attachmentPath: <workspace>/<pasta>/<Nome>_<timestamp>_<id>.<ext>", () => {
  const at = new Date(1697034500 * 1000);
  const p = attachmentPath({
    workspaceId: "ws1",
    category: "comprovativos",
    customerName: "João Silva",
    at,
    waMessageId: "wamid.ABC123XYZ",
    mime: "application/pdf",
  });
  assert.equal(p, "ws1/comprovativos/Joao_Silva_1697034500_123XYZ.pdf");
  // Duas fotos do mesmo cliente no mesmo segundo não colidem.
  const a = attachmentPath({
    workspaceId: "ws1",
    category: "anexos_gerais",
    customerName: "Ana",
    at,
    waMessageId: "m-000001",
    mime: "image/jpeg",
  });
  const b = attachmentPath({
    workspaceId: "ws1",
    category: "anexos_gerais",
    customerName: "Ana",
    at,
    waMessageId: "m-000002",
    mime: "image/jpeg",
  });
  assert.notEqual(a, b);
  assert.ok(
    a.startsWith("ws1/anexos_gerais/Ana_1697034500_") && a.endsWith(".jpg"),
  );
});

test("o prefixo é sempre o do tenant (isolamento e eliminação da conta)", () => {
  const p = attachmentPath({
    workspaceId: "ws-A",
    category: "anexos_gerais",
    customerName: "../ws-B",
    at: new Date(0),
    waMessageId: "x",
    mime: "image/png",
  });
  assert.ok(p.startsWith("ws-A/anexos_gerais/"));
  assert.equal(p.split("/").length, 3); // dois níveis: o que deleteWorkspaceMedia apaga
});
