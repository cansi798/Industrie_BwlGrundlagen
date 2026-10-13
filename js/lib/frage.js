import { h } from "./dom.js";
import { isCorrect } from "./quiz.js";
import { aufgabeView } from "./aufgabe.js";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * Zeigt eine (bereits gemischte) Frage.
 * selected: Set<number>; onChange(newSet) wird bei Auswahl aufgerufen.
 * reveal: true → richtig/falsch markieren und Erklärung zeigen (keine Auswahl mehr).
 */
const MARK = {
  right: ["✓", "Deine Wahl – richtig"],
  wrong: ["✗", "Deine Wahl – falsch"],
  missed: ["richtig", "Richtige Antwort – nicht gewählt"],
};

/** Angaben-Kasten (null, wenn die Aufgabe keine Angaben hat). */
export function angabenBox(q) {
  return q.angaben ? h("div", { class: "angaben" },
    h("span", { class: "angaben-titel" }, "Angaben"),
    h("ul", {}, q.angaben.split(/\s*;\s*/).filter(Boolean).map((a) => h("li", {}, a)))) : null;
}

export function frageView(q, opts = {}) {
  if (q.typ) return aufgabeView(q, opts);
  const { selected = new Set(), onChange = null, reveal = false } = opts;
  const ok = reveal ? isCorrect(q, selected) : null;
  const textId = `ft-${q.id}`;
  const interaktiv = !reveal && !!onChange;
  const list = h("div", { class: "opts", role: q.multi ? "group" : "radiogroup", "aria-labelledby": textId },
    q.options.map((o, i) => {
      const isSel = selected.has(i);
      let state = "";
      if (reveal) state = o.c && isSel ? "right" : !o.c && isSel ? "wrong" : o.c ? "missed" : "";
      // aria-disabled statt disabled: im Ergebnis bleiben die Antworten per Tastatur erreichbar
      return h("button", {
        type: "button",
        class: `opt ${isSel ? "selected" : ""} ${state}`.trim(),
        role: q.multi ? "checkbox" : "radio",
        "aria-checked": String(isSel),
        "aria-disabled": interaktiv ? null : "true",
        "data-focus": `${q.id}:${o.t}`,
        onclick: interaktiv ? () => {
          const next = new Set(q.multi ? selected : []);
          if (q.multi && next.has(i)) next.delete(i);
          else next.add(i);
          onChange(next);
        } : null,
      },
      h("span", { class: "opt-letter", "aria-hidden": "true" }, LETTERS[i]),
      h("span", { class: "opt-text" }, o.t),
      state ? h("span", { class: "opt-mark" },
        h("span", { "aria-hidden": "true" }, MARK[state][0]),
        h("span", { class: "sr-only" }, MARK[state][1])) : null);
    }));

  return h("div", { class: "frage" },
    angabenBox(q),
    h("p", { class: "frage-text", id: textId }, q.q),
    q.multi ? h("p", { class: "hint" }, "Mehrere Antworten möglich") : null,
    list,
    reveal ? h("div", { class: `expl ${ok ? "expl-ok" : "expl-bad"}`, role: "status" },
      h("strong", {}, ok ? "Richtig!" : selected.size ? "Leider falsch." : "Nicht beantwortet."),
      h("p", {}, q.expl)) : null);
}
