import assert from "node:assert/strict";
import test from "node:test";
import { buildEmbedScript, safeJson } from "./embed-script.ts";
import { POPUP_PRESETS, normalizeDomain, originAllowed, popupConfigSchema, popupInputSchema, validateSubmission } from "./schema.ts";

const config = (over: Record<string, unknown> = {}) => popupConfigSchema.parse({ title: "Olá", ...over });

test("todos os modelos prontos são popups válidos", () => {
  for (const preset of POPUP_PRESETS) assert.ok(popupInputSchema.safeParse(preset.input).success, preset.id);
});

test("a cor tem de ser #rrggbb e os domínios normalizam-se", () => {
  assert.equal(popupConfigSchema.safeParse({ title: "x", color: "red; background:url(x)" }).success, false);
  assert.equal(popupConfigSchema.safeParse({ title: "x", color: "#12ab9f" }).success, true);
  assert.equal(normalizeDomain("https://www.Loja.pt/promo?x=1"), "loja.pt");
  assert.deepEqual(config({ allowedDomains: ["https://www.loja.pt/", "Shop.EXAMPLE.com"] }).allowedDomains, ["loja.pt", "shop.example.com"]);
  assert.equal(popupConfigSchema.safeParse({ title: "x", allowedDomains: ["não é um domínio"] }).success, false);
});

test("origem autorizada: sem lista aceita tudo; com lista só o domínio e subdomínios", () => {
  assert.equal(originAllowed("https://qualquer.com", []), true);
  assert.equal(originAllowed("https://loja.pt", ["loja.pt"]), true);
  assert.equal(originAllowed("https://www.loja.pt", ["loja.pt"]), true);
  assert.equal(originAllowed("https://shop.loja.pt", ["loja.pt"]), true);
  assert.equal(originAllowed("https://evil-loja.pt", ["loja.pt"]), false);
  assert.equal(originAllowed("https://loja.pt.evil.com", ["loja.pt"]), false);
  assert.equal(originAllowed(null, ["loja.pt"]), false);
  assert.equal(originAllowed("não-é-url", ["loja.pt"]), false);
});

test("registo: consentimento e telefone são sempre obrigatórios", () => {
  const c = config({ defaultDialCode: "351" });
  assert.equal(validateSubmission({ phone: "912345678", consent: false }, c).ok, false);
  const bad = validateSubmission({ phone: "abc", consent: true }, c);
  assert.ok(!bad.ok && bad.error === "invalid_phone");
  const ok = validateSubmission({ name: "  Maria  Silva ", phone: "912 345 678", consent: true }, c);
  assert.ok(ok.ok && ok.data.phone === "351912345678" && ok.data.name === "Maria Silva" && ok.data.email === null);
  assert.equal(validateSubmission("lixo", c).ok, false);
});

test("registo: nome e e-mail seguem o que o popup pede", () => {
  const required = config({ askName: "required", askEmail: "required", defaultDialCode: "351" });
  const base = { phone: "912345678", consent: true };
  assert.ok(!validateSubmission(base, required).ok);
  assert.ok(!validateSubmission({ ...base, name: "Ana" }, required).ok);
  assert.ok(!validateSubmission({ ...base, name: "Ana", email: "isto-nao-e-email" }, required).ok);
  const done = validateSubmission({ ...base, name: "Ana", email: "ANA@Exemplo.pt" }, required);
  assert.ok(done.ok && done.data.email === "ana@exemplo.pt");
  const off = config({ askName: "off", askEmail: "off", defaultDialCode: "351" });
  const ignored = validateSubmission({ ...base, name: "Ana", email: "x@y.pt" }, off);
  assert.ok(ignored.ok && ignored.data.name === null && ignored.data.email === null); // campos desligados ignoram-se
});

test("registo: nomes com endereços e caracteres invisíveis são limpos", () => {
  const c = config({ defaultDialCode: "351" });
  const r = validateSubmission({ name: "Ana\u200b http://spam.example Costa", phone: "912345678", consent: true }, c);
  assert.ok(r.ok && r.data.name === "Ana Costa", JSON.stringify(r));
});

test("o script gerado é JavaScript válido e não deixa o texto do cliente escapar", () => {
  const evil = config({ title: "</script><script>alert(1)</script>", description: "\u2028 e \u2029 e \" e ' e \\", buttonText: "<img onerror=x>" });
  const script = buildEmbedScript({ key: "abc123", apiBase: "https://app.example/api/embed/abc123", config: evil });
  assert.doesNotThrow(() => new Function("window", "document", script.replace(/typeof document==="undefined"\|\|/, "false||")), "sintaxe");
  assert.ok(!script.includes("</script>"), "sem </script> literal");
  assert.ok(!script.includes("\u2028") && !script.includes("\u2029"));
  assert.ok(script.includes("textContent") && !script.includes("innerHTML"), "usa textContent, nunca innerHTML");
  assert.equal(safeJson({ a: "<&>" }), '{"a":"\\u003c\\u0026\\u003e"}');
});
