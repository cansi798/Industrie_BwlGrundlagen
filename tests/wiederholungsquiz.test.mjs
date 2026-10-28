import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lies = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const wq = lies("data/wiederholungsquiz.json");

test("Wiederholungsquiz: 12 Tage mit je 10 Fragen", () => {
  assert.equal(wq.sessions.length, 12);
  for (const s of wq.sessions) {
    const fragen = lies(s.datei);
    assert.equal(fragen.length, 10, s.id);
    assert.equal(s.anzahl, 10);
    assert.deepEqual(fragen.map((q) => q.id), s.ids, s.id);
    assert.ok(s.ids.every((id) => id.startsWith(`tag${String(s.tagNr).padStart(2, "0")}-`)), s.id);
  }
});

test("Wiederholungsquiz: keine doppelten Fragen, jede mit 1 oder 2 richtigen Antworten", () => {
  const ids = wq.sessions.flatMap((s) => s.ids);
  assert.equal(new Set(ids).size, 120);
  for (const s of wq.sessions) for (const q of lies(s.datei)) {
    const r = q.options.filter((o) => o.c).length;
    assert.ok(r >= 1 && r <= 2, q.id);
    assert.ok(q.expl.length > 0, q.id);
  }
});
