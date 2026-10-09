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

/** Kopie der Frage mit gemischten Antworten und Hinweis auf Mehrfachauswahl. */
export function prepareQuestion(q, rand = cryptoRandom) {
  const options = shuffle(q.options, rand).map((o) => ({ ...o }));
  return { ...q, options, multi: options.filter((o) => o.c).length > 1 };
}

/** Richtig nur, wenn genau die Menge der richtigen Optionen gewählt wurde. */
export function isCorrect(question, selectedIdx) {
  const chosen = new Set(selectedIdx ?? []);
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
