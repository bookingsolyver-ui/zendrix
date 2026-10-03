import assert from "node:assert/strict";
import test from "node:test";
import { normalizePhone, normalizePhoneWithDial } from "./phone.ts";

test("normaliza formatos comuns para só dígitos internacionais", () => {
  assert.equal(normalizePhone("+351 912 345 678"), "351912345678");
  assert.equal(normalizePhone("00351912345678"), "351912345678");
  assert.equal(normalizePhone("(351) 912-345-678"), "351912345678");
  assert.equal(normalizePhone("+55 11 99999-9999"), "5511999999999");
});

test("recusa números incompletos, longos demais ou com letras", () => {
  assert.equal(normalizePhone("912345678x"), null);
  assert.equal(normalizePhone("1234567"), null);
  assert.equal(normalizePhone("1234567890123456"), null);
  assert.equal(normalizePhone("0912345678"), null);
  assert.equal(normalizePhone(""), null);
});

test("telefone de visitante: aplica o indicativo por omissão só quando falta", () => {
  assert.equal(normalizePhoneWithDial("912 345 678", "351"), "351912345678");
  assert.equal(normalizePhoneWithDial("0912345678", "351"), "351912345678");
  assert.equal(normalizePhoneWithDial("351912345678", "351"), "351912345678"); // já completo: não duplica
  assert.equal(normalizePhoneWithDial("+44 7911 123456", "351"), "447911123456"); // "+" manda
  assert.equal(normalizePhoneWithDial("912345678", ""), null); // sem indicativo e sem "+": incompleto
  assert.equal(normalizePhoneWithDial("abc", "351"), null);
});
