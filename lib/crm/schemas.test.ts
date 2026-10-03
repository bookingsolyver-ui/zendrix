import assert from "node:assert/strict";
import test from "node:test";
import { docInputSchema, insertAt, taskCreateSchema, taskPatchSchema } from "./schemas.ts";

test("tarefa nova: título obrigatório, valores por omissão e data de entrega", () => {
  const ok = taskCreateSchema.safeParse({ title: "  Ligar ao cliente ", dueAt: "2026-10-09" });
  assert.ok(ok.success);
  assert.equal(ok.data.title, "Ligar ao cliente");
  assert.equal(ok.data.status, "TODO");
  assert.equal(ok.data.priority, "MEDIUM");
  assert.equal(ok.data.dueAt?.toISOString(), "2026-10-09T12:00:00.000Z");
  assert.equal(taskCreateSchema.safeParse({ title: "" }).success, false);
  assert.equal(taskCreateSchema.safeParse({ title: "x", dueAt: "09/10/2026" }).success, false);
  assert.equal(taskCreateSchema.safeParse({ title: "x", status: "ARQUIVADA" }).success, false);
});

test("tarefa: o patch aceita só o que vem e limpa a data com vazio", () => {
  const patch = taskPatchSchema.safeParse({ status: "DOING", index: 0 });
  assert.ok(patch.success && patch.data.status === "DOING" && patch.data.title === undefined);
  const clear = taskPatchSchema.safeParse({ dueAt: "" });
  assert.ok(clear.success && clear.data.dueAt === null);
  assert.equal(taskPatchSchema.safeParse({ index: -1 }).success, false);
});

test("mover uma tarefa para uma posição reordena a coluna", () => {
  assert.deepEqual(insertAt(["a", "b", "c"], "x", 1), ["a", "x", "b", "c"]);
  assert.deepEqual(insertAt(["a", "b", "c"], "b", 0), ["b", "a", "c"]);
  assert.deepEqual(insertAt(["a", "b"], "x", 99), ["a", "b", "x"]);
  assert.deepEqual(insertAt([], "x", 0), ["x"]);
});

test("documento: título obrigatório e tamanho limitado", () => {
  assert.ok(docInputSchema.safeParse({ title: "Guião", body: "texto" }).success);
  assert.equal(docInputSchema.safeParse({ title: "" }).success, false);
  assert.equal(docInputSchema.safeParse({ title: "x", body: "a".repeat(20_001) }).success, false);
});
