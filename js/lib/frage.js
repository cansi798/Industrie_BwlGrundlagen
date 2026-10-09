import { h } from "./dom.js";
import { isCorrect } from "./quiz.js";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * Zeigt eine (bereits gemischte) Frage.
 * selected: Set<number>; onChange(newSet) wird bei Auswahl aufgerufen.
 * reveal: true → richtig/falsch markieren und Erklärung zeigen (keine Auswahl mehr).
 */
export function frageView(q, { selected = new Set(), onChange = null, reveal = false } = {}) {
  const ok = reveal ? isCorrect(q, selected) : null;
  const list = h("div", { class: "opts", role: q.multi ? "group" : "radiogroup" },
    q.options.map((o, i) => {
      const isSel = selected.has(i);
      let state = "";
      if (reveal) state = o.c && isSel ? "right" : !o.c && isSel ? "wrong" : o.c ? "missed" : "";
      const btn = h("button", {
        type: "button",
        class: `opt ${isSel ? "selected" : ""} ${state}`.trim(),
        role: q.multi ? "checkbox" : "radio",
        "aria-checked": String(isSel),
        disabled: reveal || !onChange,
        onclick: () => {
          const next = new Set(q.multi ? selected : []);
          if (q.multi && next.has(i)) next.delete(i);
          else next.add(i);
          onChange(next);
        },
      },
      h("span", { class: "opt-letter", "aria-hidden": "true" }, LETTERS[i]),
      h("span", { class: "opt-text" }, o.t),
      reveal && state ? h("span", { class: "opt-mark" },
        state === "right" ? "✓" : state === "wrong" ? "✗" : "richtig") : null);
      return btn;
    }));

  return h("div", { class: "frage" },
    h("p", { class: "frage-text" }, q.q),
    q.multi ? h("p", { class: "hint" }, "Mehrere Antworten möglich") : null,
    list,
    reveal ? h("div", { class: `expl ${ok ? "expl-ok" : "expl-bad"}`, role: "status" },
      h("strong", {}, ok ? "Richtig!" : selected.size ? "Leider falsch." : "Nicht beantwortet."),
      h("p", {}, q.expl)) : null);
}
