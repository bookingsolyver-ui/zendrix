import assert from "node:assert/strict";
import test from "node:test";
import { mapColumns } from "./fuzzy.ts";
import { buildRecords, mapCompetitorJson, mapStage } from "./records.ts";

test("linhas de CSV: telefone normalizado com o indicativo, duplicados e inválidos rejeitados", () => {
  const rows = [
    { "Nome Cliente": "Ana", Telemóvel: "912 345 678", "E-mail": "ANA@x.pt" },
    { "Nome Cliente": "Ana (outra vez)", Telemóvel: "+351 912345678", "E-mail": "" },
    { "Nome Cliente": "Sem número", Telemóvel: "abc", "E-mail": "" },
  ];
  const { records, rejected } = buildRecords(rows, mapColumns(Object.keys(rows[0]), rows), "351");
  assert.equal(records.length, 1);
  assert.deepEqual({ waId: records[0].waId, name: records[0].name, email: records[0].email }, { waId: "351912345678", name: "Ana", email: "ana@x.pt" });
  assert.deepEqual(rejected.map((r) => r.reason), ["duplicate_in_file", "invalid_phone"]);
});

test("«ganho/cliente» nunca vira WON (só um pagamento o faz) e o estado original fica na nota", () => {
  assert.equal(mapStage("Won"), "QUALIFIED");
  assert.equal(mapStage("Perdido"), "LOST");
  assert.equal(mapStage("em conversa"), "ENGAGED");
  assert.equal(mapStage(""), "NEW");
  const { records } = buildRecords([{ nome: "Rui", telefone: "+351 912 345 678", estado: "Ganho" }], mapColumns(["nome", "telefone", "estado"]), "351");
  assert.equal(records[0].stage, "QUALIFIED");
  assert.match(records[0].notes ?? "", /Estado original: Ganho/);
});

test("JSON de concorrente: envelope, objetos aninhados, arrays de {value} e nome+apelido", () => {
  const json = {
    data: [
      { properties: { firstname: "Maria", lastname: "Costa" }, phone: [{ value: "+351 912 345 678", primary: true }], email: [{ value: "maria@x.pt" }] },
      { properties: { firstname: "Rui", lastname: "Lima" }, phone: [{ value: "+351 913 000 111" }], email: [] },
    ],
  };
  const { rows, mapping } = mapCompetitorJson(json);
  const { records } = buildRecords(rows, mapping, "351");
  assert.deepEqual(records.map((r) => [r.name, r.waId, r.email]), [["Maria Costa", "351912345678", "maria@x.pt"], ["Rui Lima", "351913000111", null]]);
});
