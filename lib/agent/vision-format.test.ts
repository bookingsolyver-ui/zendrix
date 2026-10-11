import test from "node:test";
import assert from "node:assert/strict";
import {
  inboundLabel,
  MAX_VISION_BYTES,
  toDataUrl,
  visionEligible,
  withImage,
} from "./vision-format.ts";

test("visionEligible: só imagens suportadas e dentro do limite", () => {
  assert.equal(visionEligible("image/jpeg", 1000), true);
  assert.equal(visionEligible("image/png; charset=binary", 1000), true);
  assert.equal(visionEligible("application/pdf", 1000), false);
  assert.equal(visionEligible("image/jpeg", MAX_VISION_BYTES + 1), false);
  assert.equal(visionEligible("image/jpeg", 0), false);
  assert.equal(visionEligible(null, 10), false);
});

test("inboundLabel: anota imagens e documentos, conserva a legenda, ignora o resto", () => {
  assert.equal(
    inboundLabel("image", "[imagem]"),
    "[O cliente enviou uma imagem]",
  );
  assert.equal(
    inboundLabel("image", "tem em azul?"),
    "[O cliente enviou uma imagem]: tem em azul?",
  );
  assert.match(
    inboundLabel("document", "[documento]") ?? "",
    /^\[O cliente enviou um documento/,
  );
  assert.equal(inboundLabel("text", "olá"), null);
  assert.equal(inboundLabel(undefined, "olá"), null);
});

test("withImage / toDataUrl: partes no formato image_url", () => {
  const url = toDataUrl("image/jpeg; x=y", Buffer.from("abc"));
  assert.equal(url, "data:image/jpeg;base64,YWJj");
  const parts = withImage("[O cliente enviou uma imagem]", url);
  assert.deepEqual(parts, [
    { type: "text", text: "[O cliente enviou uma imagem]" },
    { type: "image_url", image_url: { url } },
  ]);
});
