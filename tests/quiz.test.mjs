import { test } from "node:test";
import assert from "node:assert/strict";
import { shuffle, prepareQuestion, isCorrect, drawExam, score, restTime, PRUEFUNG, parseZahl } from "../js/lib/quiz.js";

// Deterministischer Zufall (LCG) für reproduzierbare Tests
function seeded(seed = 42) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

const frage = (id, richtig = [0]) => ({
  id, q: `Frage ${id}`, expl: "Weil.",
  options: [0, 1, 2, 3].map((i) => ({ t: `${id}-${i}`, c: richtig.includes(i) })),
});
const pool = (prefix, n) => Array.from({ length: n }, (_, i) => frage(`${prefix}-${i}`));

test("shuffle erhält alle Elemente und verändert das Original nicht", () => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8];
  const copy = [...arr];
  const out = shuffle(arr, seeded());
  assert.deepEqual(arr, copy);
  assert.equal(out.length, arr.length);
  assert.deepEqual([...out].sort(), [...arr].sort());
});

test("shuffle nutzt ohne rand-Argument crypto", () => {
  assert.equal(shuffle([1, 2, 3]).length, 3);
});

test("prepareQuestion mischt Optionen und erkennt Mehrfachauswahl", () => {
  const p = prepareQuestion(frage("a", [1, 3]), seeded(7));
  assert.equal(p.id, "a");
  assert.deepEqual(p.options.map((o) => o.t).sort(), ["a-0", "a-1", "a-2", "a-3"]);
  assert.equal(p.options.filter((o) => o.c).length, 2);
  assert.equal(p.multi, true);
  assert.equal(prepareQuestion(frage("b"), seeded()).multi, false);
});

test("isCorrect bei Einfachauswahl", () => {
  const q = frage("e", [2]);
  assert.equal(isCorrect(q, [2]), true);
  assert.equal(isCorrect(q, [1]), false);
  assert.equal(isCorrect(q, []), false);
});

test("isCorrect bei Mehrfachauswahl: nur genau alle richtigen zählen", () => {
  const q = frage("m", [0, 3]);
  assert.equal(isCorrect(q, [3, 0]), true);
  assert.equal(isCorrect(q, new Set([0, 3])), true);
  assert.equal(isCorrect(q, [0]), false);
  assert.equal(isCorrect(q, [0, 3, 1]), false);
  assert.equal(isCorrect(q, []), false);
  assert.equal(isCorrect(q, undefined), false);
});

test("drawExam verteilt 30 Fragen gleichmäßig auf 3 Tage", () => {
  const out = drawExam({ t1: pool("t1", 60), t2: pool("t2", 60), t3: pool("t3", 60) }, 30, seeded());
  assert.equal(out.length, 30);
  assert.equal(new Set(out.map((q) => q.id)).size, 30);
  for (const t of ["t1", "t2", "t3"]) assert.equal(out.filter((q) => q.id.startsWith(t + "-")).length, 10);
});

test("drawExam mit nur einem Tag", () => {
  const out = drawExam({ t1: pool("t1", 60) }, 30, seeded());
  assert.equal(out.length, 30);
  assert.ok(out.every((q) => q.id.startsWith("t1-")));
  assert.equal(new Set(out.map((q) => q.id)).size, 30);
});

test("drawExam bei ungleich großen Tagen nimmt alle Fragen des kleinen Tags", () => {
  const out = drawExam({ a: pool("a", 60), b: pool("b", 5), c: pool("c", 60) }, 30, seeded(3));
  assert.equal(out.length, 30);
  assert.equal(new Set(out.map((q) => q.id)).size, 30);
  assert.equal(out.filter((q) => q.id.startsWith("b-")).length, 5);
});

test("drawExam bei 4 Tagen verteilt den Rest", () => {
  const out = drawExam({ a: pool("a", 60), b: pool("b", 60), c: pool("c", 60), d: pool("d", 60) }, 30, seeded());
  assert.equal(out.length, 30);
  for (const t of ["a", "b", "c", "d"]) {
    const n = out.filter((q) => q.id.startsWith(t + "-")).length;
    assert.ok(n === 7 || n === 8, `${t}: ${n}`);
  }
});

test("drawExam kappt auf die Poolgröße", () => {
  assert.equal(drawExam({ a: pool("a", 20) }, 30, seeded()).length, 20);
  assert.equal(drawExam({}, 30, seeded()).length, 0);
});

test("score: Bestehensgrenze 50 %, Unbeantwortetes zählt falsch", () => {
  const qs = pool("s", 30);
  const answers = {};
  qs.slice(0, 15).forEach((q) => (answers[q.id] = [0]));
  assert.deepEqual(score(qs, answers), { punkte: 15, gesamt: 30, prozent: 50, bestanden: true });
  delete answers[qs[0].id];
  const r = score(qs, answers);
  assert.equal(r.punkte, 14);
  assert.equal(r.prozent, 47);
  assert.equal(r.bestanden, false);
});

test("score bei leerer Prüfung", () => {
  assert.deepEqual(score([], {}), { punkte: 0, gesamt: 0, prozent: 0, bestanden: false });
});

test("restTime", () => {
  assert.equal(restTime(null, 123), null);
  assert.equal(restTime(1000, 400), 600);
  assert.equal(restTime(1000, 5000), 0);
});

test("PRUEFUNG-Konstanten aus dem Spec", () => {
  assert.deepEqual(PRUEFUNG, { fragen: 30, minuten: 45, bestehen: 50 });
});

test("parseZahl versteht deutsche und englische Schreibweisen", () => {
  for (const [ein, aus] of [
    ["30", 30], ["30,5", 30.5], [" 30,5 ", 30.5], ["1.234,56", 1234.56], ["1234.56", 1234.56],
    ["1.234", 1234], ["1.200 €", 1200], ["12 %", 12], ["1.5", 1.5], ["0,25", 0.25],
    ["-12.000", -12000], ["−12.000", -12000], ["-1,5", -1.5], ["1 200", 1200],
  ]) assert.equal(parseZahl(ein), aus, ein);
});

test("parseZahl liefert null bei ungültiger Eingabe", () => {
  for (const ein of ["", "   ", "abc", "12,3,4", "1.2.3,4,5", "€", "-", undefined, null])
    assert.equal(parseZahl(ein), null, String(ein));
});

const rechnen = { id: "r1", typ: "rechnen", q: "?", loesung: 30, toleranz: 0.1, expl: "x" };

test("isCorrect Rechnen: innerhalb der Toleranz richtig, außerhalb falsch", () => {
  assert.equal(isCorrect(rechnen, "30"), true);
  assert.equal(isCorrect(rechnen, "30,1"), true);
  assert.equal(isCorrect(rechnen, "29,9 %"), true);
  assert.equal(isCorrect(rechnen, "30,2"), false);
  assert.equal(isCorrect(rechnen, ""), false);
  assert.equal(isCorrect(rechnen, undefined), false);
});

test("isCorrect Rechnen: ohne toleranz gilt 0,01", () => {
  const q = { ...rechnen, toleranz: undefined, loesung: -1250.5 };
  assert.equal(isCorrect(q, "-1.250,51"), true);
  assert.equal(isCorrect(q, "-1.250,52"), false);
});

test("isCorrect Offen: nur 'gewusst' zählt als richtig", () => {
  const q = { id: "o1", typ: "offen", q: "?", kernpunkte: ["a", "b"], expl: "x" };
  assert.equal(isCorrect(q, "gewusst"), true);
  assert.equal(isCorrect(q, "teilweise"), false);
  assert.equal(isCorrect(q, "nicht"), false);
  assert.equal(isCorrect(q, undefined), false);
});

test("prepareQuestion lässt Rechnen und Offen unverändert", () => {
  const out = prepareQuestion(rechnen, seeded());
  assert.deepEqual(out, rechnen);
  assert.notEqual(out, rechnen);
});
