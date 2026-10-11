import test from "node:test";
import assert from "node:assert/strict";
import { BANK_MARKER, formatBankMessage, parseOrder, groupIban, isBankMessage, isProofMessageType, isValidIban, validateBank } from "./bank-format.ts";

test("IBAN: valida o formato e o dígito de controlo", () => {
  assert.equal(isValidIban("GB82 WEST 1234 5698 7654 32"), true); // exemplo oficial
  assert.equal(isValidIban("PT50 0002 0123 1234 5678 9015 4"), true); // exemplo português
  assert.equal(isValidIban("GB82 WEST 1234 5698 7654 33"), false); // um dígito errado
  assert.equal(isValidIban("1234"), false);
  assert.equal(isValidIban(""), false);
});

test("validateBank: aponta o que está errado", () => {
  const ok = { bankName: "BAI", holderName: "Wenove Lda", iban: "PT50000201231234567890154" };
  assert.deepEqual(validateBank(ok), []);
  assert.deepEqual(validateBank({ ...ok, bankName: "", iban: "x" }), ["bank_name", "iban"]);
  assert.deepEqual(validateBank({ ...ok, nib: "123" }), ["nib"]);
  assert.deepEqual(validateBank({ ...ok, nib: "0040 0000 6727 9283 1011 5" }), []); // 21 dígitos com espaços
});

test("a mensagem leva a marca, o IBAN agrupado e o pedido do comprovativo", () => {
  const text = formatBankMessage(
    { bankName: "BAI", holderName: "Wenove Lda", iban: "pt50000201231234567890154", nib: "004000006727928310115", instructions: "Use o seu nome como referência." },
    { itemName: "Plano Pro", amountLabel: "25 000 Kz" },
  );
  assert.ok(text.startsWith(BANK_MARKER) && isBankMessage(text));
  assert.match(text, /Produto: Plano Pro/);
  assert.match(text, /Valor: 25 000 Kz/);
  assert.match(text, /IBAN: PT50 0002 0123 1234 5678 9015 4/);
  assert.match(text, /NIB: 004000006727928310115/);
  assert.match(text, /Use o seu nome como referência\./);
  assert.match(text, /comprovativo/);
  assert.equal(groupIban("pt50000201231234567890154"), "PT50 0002 0123 1234 5678 9015 4");
  assert.ok(!formatBankMessage({ bankName: "BAI", holderName: "X Y", iban: "PT50000201231234567890154" }).includes("undefined"));
});

test("só imagens e documentos podem ser comprovativos", () => {
  assert.equal(isProofMessageType("image"), true);
  assert.equal(isProofMessageType("document"), true);
  for (const t of ["text", "audio", "voice", "video", "sticker"]) assert.equal(isProofMessageType(t), false);
});

test("o pedido (produto e valor) lê-se da mensagem enviada", () => {
  const text = formatBankMessage({ bankName: "BAI", holderName: "X Y", iban: "PT50000201231234567890154" }, { itemName: "Plano Pro", amountLabel: "25 000 Kz" });
  assert.deepEqual(parseOrder(text), { itemName: "Plano Pro", amountLabel: "25 000 Kz" });
  assert.deepEqual(parseOrder(formatBankMessage({ bankName: "BAI", holderName: "X Y", iban: "PT50000201231234567890154" })), { itemName: null, amountLabel: null });
});
