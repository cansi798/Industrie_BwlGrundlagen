import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Datentest für die 200 Wiederholungsaufgaben (Tag 1–6)
const ROOT = new URL("../", import.meta.url);
const lies = (pfad) => JSON.parse(fs.readFileSync(new URL(pfad, ROOT), "utf8"));
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// Soll-Verteilung je Tag: [MC, Offen, Rechnen]
const SOLL = { 1: [18, 12, 4], 2: [17, 8, 9], 3: [17, 7, 9], 4: [16, 7, 10], 5: [16, 7, 10], 6: [16, 9, 8] };

const typ = (a) => a.typ ?? "mc";
const index = lies("data/wiederholung.json");

// Aufgaben einer Session laden; fehlende Datei ergibt null (kein Absturz beim Import)
function lade(s) {
  try { return lies(s.datei); } catch { return null; }
}
const daten = new Map(index.sessions.map((s) => [s.id, lade(s)]));
// Bei fehlender Datei schlägt der jeweilige Test sauber fehl
const aufgaben = (s) => {
  const d = daten.get(s.id);
  assert.ok(Array.isArray(d), `${s.datei} fehlt oder ist kein Array`);
  return d;
};

// Bestehende Fragen (Teil 1, je Tag zwei Dateien) für den Kopie-Test
function bestehendeFragen(nr) {
  const nn = String(nr).padStart(2, "0");
  return [1, 2].flatMap((k) => lies(`data/tag${nn}-${k}.json`)).map((f) => norm(f.q));
}

for (const s of index.sessions) {
  const nn = String(s.tagNr).padStart(2, "0");

  test(`${s.id}: datei existiert`, () => {
    assert.ok(fs.existsSync(new URL(s.datei, ROOT)), `${s.datei} fehlt`);
    assert.ok(Array.isArray(daten.get(s.id)), `${s.datei} ist kein gültiges JSON-Array`);
  });

  test(`${s.id}: anzahl stimmt mit Dateilänge überein`, () => {
    assert.equal(aufgaben(s).length, s.anzahl);
  });

  test(`${s.id}: Verteilung MC/Offen/Rechnen`, () => {
    const a = aufgaben(s);
    const ist = ["mc", "offen", "rechnen"].map((t) => a.filter((x) => typ(x) === t).length);
    assert.deepEqual(ist, SOLL[s.tagNr]);
  });

  test(`${s.id}: IDs fortlaufend`, () => {
    const soll = aufgaben(s).map((_, i) => `${s.id}-${String(i + 1).padStart(2, "0")}`);
    assert.deepEqual(aufgaben(s).map((x) => x.id), soll);
  });

  test(`${s.id}: Multiple Choice gültig`, () => {
    for (const a of aufgaben(s).filter((x) => typ(x) === "mc")) {
      assert.ok(!("typ" in a), `${a.id}: MC darf kein typ haben`);
      assert.ok(Array.isArray(a.options) && a.options.length === 4, `${a.id}: genau 4 Optionen`);
      assert.ok(a.options.some((o) => o.c === true), `${a.id}: mindestens eine richtige Option`);
      const texte = a.options.map((o) => norm(String(o.t)));
      assert.ok(texte.every((t) => t), `${a.id}: leerer Optionstext`);
      assert.equal(new Set(texte).size, 4, `${a.id}: Optionstexte nicht eindeutig`);
    }
  });

  test(`${s.id}: Rechenaufgaben nachgerechnet`, () => {
    for (const a of aufgaben(s).filter((x) => typ(x) === "rechnen")) {
      for (const f of ["q", "angaben", "einheit", "loesung", "rechnung", "schritte", "expl"]) {
        assert.ok(f in a, `${a.id}: Feld ${f} fehlt`);
      }
      assert.equal(typeof a.einheit, "string", `${a.id}: einheit muss String sein`);
      assert.equal(typeof a.loesung, "number", `${a.id}: loesung muss Zahl sein`);
      assert.match(a.rechnung, /^[\d\s.+\-*/()]+$/, `${a.id}: unerlaubte Zeichen in rechnung`);
      const wert = Function(`return (${a.rechnung})`)();
      assert.ok(Math.abs(wert - a.loesung) <= 0.005, `${a.id}: rechnung ergibt ${wert}, loesung ist ${a.loesung}`);
      assert.ok(Math.abs(Math.round(a.loesung * 100) / 100 - a.loesung) < 1e-9, `${a.id}: loesung hat mehr als 2 Nachkommastellen`);
      assert.ok(Array.isArray(a.schritte) && a.schritte.length > 0, `${a.id}: schritte leer`);
    }
  });

  test(`${s.id}: Offene Fragen gültig`, () => {
    for (const a of aufgaben(s).filter((x) => typ(x) === "offen")) {
      assert.ok(Array.isArray(a.kernpunkte), `${a.id}: kernpunkte fehlt`);
      assert.ok(a.kernpunkte.length >= 2 && a.kernpunkte.length <= 4, `${a.id}: 2–4 Kernpunkte nötig`);
    }
  });

  test(`${s.id}: Frage und Erklärung`, () => {
    for (const a of aufgaben(s)) {
      assert.ok(typeof a.q === "string" && a.q.trim(), `${a.id}: q leer`);
      assert.ok(typeof a.expl === "string" && a.expl.length >= 60 && a.expl.length <= 600,
        `${a.id}: expl muss 60–600 Zeichen haben (ist ${a.expl?.length})`);
    }
  });

  test(`${s.id}: keine Kopie bestehender Fragen`, () => {
    const alt = new Set(bestehendeFragen(s.tagNr));
    assert.ok(alt.size > 0, `keine bestehenden Fragen für tag${nn} gefunden`);
    for (const a of aufgaben(s)) {
      assert.ok(!alt.has(norm(a.q)), `${a.id}: Fragetext existiert schon in tag${nn}`);
    }
  });
}

test("Gesamt: 200 Aufgaben, 100 MC, 50 offen, 50 Rechnen", () => {
  const alle = index.sessions.flatMap((s) => aufgaben(s));
  const zaehl = (t) => alle.filter((x) => typ(x) === t).length;
  assert.deepEqual([alle.length, zaehl("mc"), zaehl("offen"), zaehl("rechnen")], [200, 100, 50, 50]);
  assert.equal(new Set(alle.map((x) => x.id)).size, 200, "IDs nicht eindeutig");
});
