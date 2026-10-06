import assert from "node:assert/strict";
import test from "node:test";
import { levenshtein, mapColumns, normalizeHeader } from "./fuzzy.ts";

const columnsOf = (mapping: ReturnType<typeof mapColumns>) => Object.fromEntries(Object.entries(mapping).map(([k, v]) => [k, v.column]));

test("Levenshtein e normalização de cabeçalhos (acentos, maiúsculas, pontuação)", () => {
  assert.equal(levenshtein("telemovel", "telemovl"), 1);
  assert.equal(normalizeHeader("  Telemóvel (PT) "), "telemovel pt");
});

test("«Nome Cliente», «Contacto», «E-mail» mapeiam-se para os campos certos", () => {
  const rows = [{ "Nome Cliente": "Ana Silva", Contacto: "912 345 678", "E-mail": "ana@x.pt" }];
  assert.deepEqual(columnsOf(mapColumns(["Nome Cliente", "Contacto", "E-mail"], rows)), { client_name: "Nome Cliente", phone: "Contacto", email: "E-mail" });
});

test("«Contacto» com e-mails dentro é e-mail, e «Telemóvel» com gralha continua a ser telefone", () => {
  const rows = [{ Contacto: "ana@x.pt", Telemovl: "+351 912 345 678", Nome: "Ana" }];
  const mapped = columnsOf(mapColumns(["Contacto", "Telemovl", "Nome"], rows));
  assert.equal(mapped.email, "Contacto");
  assert.equal(mapped.phone, "Telemovl");
  assert.equal(mapped.client_name, "Nome");
});

test("colunas irrelevantes não se mapeiam e cada coluna serve um só campo", () => {
  const mapped = columnsOf(mapColumns(["ID interno", "Cor favorita", "Nome"], [{ "ID interno": "1", "Cor favorita": "azul", Nome: "Rui" }]));
  assert.deepEqual(mapped, { client_name: "Nome" });
});

test("cabeçalhos em inglês e espanhol", () => {
  const mapped = columnsOf(mapColumns(["Full Name", "Mobile", "Email Address"]));
  assert.deepEqual(mapped, { client_name: "Full Name", phone: "Mobile", email: "Email Address" });
});
