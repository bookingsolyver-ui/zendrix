import { test } from "node:test";
import assert from "node:assert/strict";
import { legalDocument, legalLang, type LegalEntity } from "./content.ts";

const entity: LegalEntity = { name: "Acme Lda", address: "Rua X, Lisboa", email: "privacidade@acme.test" };

test("legal: as duas línguas têm os mesmos documentos, secções e numeração", () => {
  for (const kind of ["terms", "privacy"] as const) {
    const pt = legalDocument(kind, "pt", entity, "3 de outubro de 2026");
    const en = legalDocument(kind, "en", entity, "October 3, 2026");
    assert.equal(pt.sections.length, en.sections.length, kind);
    pt.sections.forEach((section, i) => {
      assert.equal(section.heading.split(".")[0], String(i + 1), `${kind} pt #${i}: ${section.heading}`);
      assert.equal(en.sections[i].heading.split(".")[0], String(i + 1), `${kind} en #${i}`);
      assert.ok(section.body.length > 0 && en.sections[i].body.length > 0);
    });
    assert.ok(pt.updatedLabel.includes("3 de outubro de 2026") && en.updatedLabel.includes("October 3, 2026"));
  }
});

test("legal: a privacidade cobre o que a Meta e o RGPD exigem", () => {
  const text = JSON.stringify(legalDocument("privacy", "en", entity, "x")).toLowerCase();
  for (const needle of ["meta", "supabase", "stripe", "vercel", "openrouter", "how long we keep data", "delete", "/data-deletion", "access, rectification, erasure", "qualification", "stripe connect", "follow-up"]) {
    assert.ok(text.includes(needle), `falta: ${needle}`);
  }
});

test("legal: a entidade e o contacto entram no texto; sem e-mail aponta para o formulário", () => {
  const withEmail = JSON.stringify(legalDocument("privacy", "pt", entity, "x"));
  assert.ok(withEmail.includes("Acme Lda") && withEmail.includes("Rua X, Lisboa") && withEmail.includes("privacidade@acme.test"));
  const without = JSON.stringify(legalDocument("privacy", "pt", { name: "Acme", address: null, email: null }, "x"));
  assert.ok(without.includes("/data-deletion") && !without.includes("undefined") && !without.includes("null"));
});

test("legal: espanhol usa a versão inglesa", () => {
  assert.equal(legalLang("pt"), "pt");
  assert.equal(legalLang("en"), "en");
  assert.equal(legalLang("es"), "en");
});

test("legal: já não menciona o Cal.com (deixou de ser usado) e os termos cobrem vendas, agenda e seguimentos", () => {
  for (const lang of ["pt", "en"] as const) {
    const privacy = JSON.stringify(legalDocument("privacy", lang, entity, "x"));
    assert.ok(!/cal\.com/i.test(privacy), `${lang}: Cal.com ainda na privacidade`);
    const terms = JSON.stringify(legalDocument("terms", lang, entity, "x")).toLowerCase();
    for (const needle of lang === "pt" ? ["stripe", "seguimento", "reuniões", "catálogo"] : ["stripe", "follow-up", "meetings", "catalog"]) {
      assert.ok(terms.includes(needle), `${lang}: termos sem "${needle}"`);
    }
  }
});
