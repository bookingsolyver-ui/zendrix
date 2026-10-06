import assert from "node:assert/strict";
import test from "node:test";
import { isAfterHours, pickLeastLoaded } from "./hours.ts";

test("fora de horas: 20h-08h no fuso da organização", () => {
  assert.equal(isAfterHours(new Date("2026-10-06T19:30:00Z"), "Europe/Lisbon"), true); // 20:30 em Lisboa (WEST)
  assert.equal(isAfterHours(new Date("2026-10-06T18:30:00Z"), "Europe/Lisbon"), false); // 19:30
  assert.equal(isAfterHours(new Date("2026-10-06T02:00:00Z"), "Africa/Luanda"), true); // 03:00
  assert.equal(isAfterHours(new Date("2026-10-06T07:30:00Z"), "Africa/Luanda"), false); // 08:30
});

test("o vendedor com menos carga ganha; empate pelo id", () => {
  assert.equal(pickLeastLoaded([{ id: "b", load: 3 }, { id: "a", load: 3 }, { id: "c", load: 5 }])?.id, "a");
  assert.equal(pickLeastLoaded([{ id: "x", load: 9 }, { id: "y", load: 1 }])?.id, "y");
  assert.equal(pickLeastLoaded([]), null);
});
