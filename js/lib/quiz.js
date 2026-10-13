// Reine Quizlogik ohne DOM – getestet mit node --test (tests/quiz.test.mjs)

export const PRUEFUNG = { fragen: 30, minuten: 45, bestehen: 50 };

export function cryptoRandom() {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

/** Fisher-Yates; liefert eine neue, gemischte Kopie. */
export function shuffle(arr, rand = cryptoRandom) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Standardtoleranz für Rechenaufgaben (absolut). */
export const TOLERANZ_STANDARD = 0.01;

/** Kopie der Frage mit gemischten Antworten und Hinweis auf Mehrfachauswahl; Rechnen/Offen bleiben unverändert. */
export function prepareQuestion(q, rand = cryptoRandom) {
  if (q.typ) return { ...q };
  const options = shuffle(q.options, rand).map((o) => ({ ...o }));
  return { ...q, options, multi: options.filter((o) => o.c).length > 1 };
}

/** Liest eine Zahl in deutscher oder englischer Schreibweise; null bei ungültiger Eingabe. */
export function parseZahl(text) {
  if (typeof text !== "string") return null;
  let t = text.replace(/[\s €%]/g, "").replace(/[−–]/g, "-");
  if (!/^-?[\d.,]+$/.test(t)) return null;
  if (t.includes(",")) {
    if (t.split(",").length > 2) return null;
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, "");
  }
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
}

/**
 * MC: richtig nur, wenn genau die Menge der richtigen Optionen gewählt wurde.
 * Rechnen: Antwort als Text, innerhalb der Toleranz. Offen: nur Selbsteinschätzung "gewusst".
 */
export function isCorrect(question, antwort) {
  if (question.typ === "rechnen") {
    const wert = parseZahl(antwort);
    if (wert === null) return false;
    // Epsilon fängt Gleitkommafehler ab (30 − 29,9 = 0,10000000000000142)
    return Math.abs(wert - question.loesung) <= (question.toleranz ?? TOLERANZ_STANDARD) + 1e-9;
  }
  if (question.typ === "offen") return antwort === "gewusst";
  const chosen = new Set(antwort ?? []);
  if (chosen.size === 0) return false;
  return question.options.every((o, i) => o.c === chosen.has(i));
}

/**
 * Zieht n Fragen möglichst gleichmäßig aus den Tagen.
 * Plätze werden reihum (Tage in zufälliger Reihenfolge) vergeben; Tage ohne
 * weitere Fragen fallen heraus, ihr Anteil geht an die anderen.
 */
export function drawExam(poolByDay, n = PRUEFUNG.fragen, rand = cryptoRandom) {
  const days = shuffle(Object.keys(poolByDay).filter((d) => poolByDay[d].length > 0), rand);
  const quota = Object.fromEntries(days.map((d) => [d, 0]));
  let left = Math.min(n, days.reduce((sum, d) => sum + poolByDay[d].length, 0));
  while (left > 0) {
    for (const d of days) {
      if (left === 0) break;
      if (quota[d] < poolByDay[d].length) {
        quota[d]++;
        left--;
      }
    }
  }
  const picked = days.flatMap((d) => shuffle(poolByDay[d], rand).slice(0, quota[d]));
  return shuffle(picked, rand);
}

/** answers: { [frageId]: number[] } – Indizes beziehen sich auf die gemischten Optionen. */
export function score(questions, answers) {
  const gesamt = questions.length;
  const punkte = questions.filter((q) => isCorrect(q, answers[q.id])).length;
  return {
    punkte,
    gesamt,
    prozent: gesamt ? Math.round((punkte / gesamt) * 100) : 0,
    bestanden: gesamt > 0 && punkte * 100 >= PRUEFUNG.bestehen * gesamt,
  };
}

/** Restzeit in ms (nie negativ); null ohne Zeitlimit. */
export function restTime(endsAt, now) {
  return endsAt == null ? null : Math.max(0, endsAt - now);
}
