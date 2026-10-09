import { test } from "node:test";
import assert from "node:assert/strict";

// localStorage, das lesen kann, aber beim Schreiben voll ist (QuotaExceededError)
const stored = new Map([["m094.pruefung", JSON.stringify({ alt: true })]]);
globalThis.localStorage = {
  getItem: (k) => (stored.has(k) ? stored.get(k) : null),
  setItem: () => { throw new Error("QuotaExceededError"); },
  removeItem: (k) => stored.delete(k),
};
const { load, save, remove } = await import("../js/lib/store.js");

test("volles localStorage: neu Gespeichertes wird trotzdem gelesen", () => {
  save("pruefung", { neu: true });
  assert.deepEqual(load("pruefung", null), { neu: true });
});

test("volles localStorage: Speichern ohne alten Wert", () => {
  save("x", 1);
  assert.equal(load("x", 0), 1);
});

test("remove entfernt auch den Speicher-Ersatz", () => {
  save("y", 2);
  remove("y");
  assert.equal(load("y", "leer"), "leer");
});
