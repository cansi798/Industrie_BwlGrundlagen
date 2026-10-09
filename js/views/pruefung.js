import { h, topbar, fill } from "../lib/dom.js";
import { load, save } from "../lib/store.js";
import { restTime } from "../lib/quiz.js";
import { frageView } from "../lib/frage.js";

function formatZeit(ms) {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export async function render(root) {
  const state = load("pruefung", null);
  if (!state) {
    location.replace("#/pruefung");
    return;
  }
  if (state.abgegeben) {
    location.replace("#/pruefung/ergebnis");
    return;
  }

  const n = state.fragen.length;
  const main = h("div", { class: "page" });
  const timer = h("span", { class: "timer", "aria-live": "off" });
  let uebersicht = false;
  let interval = null;

  const persist = () => save("pruefung", state);
  const beantwortet = (q) => (state.antworten[q.id]?.length ?? 0) > 0;
  const offen = () => state.fragen.filter((q) => !beantwortet(q)).length;

  function abgeben(automatisch = false) {
    if (!automatisch) {
      const o = offen();
      if (o > 0 && !confirm(`${o} ${o === 1 ? "Frage ist" : "Fragen sind"} noch offen. Trotzdem abgeben?`)) return;
    }
    clearInterval(interval);
    state.abgegeben = true;
    state.automatisch = automatisch;
    persist();
    location.hash = "#/pruefung/ergebnis";
  }

  function tick() {
    const rest = restTime(state.endsAt, Date.now());
    if (rest === null) return;
    timer.textContent = `⏱ ${formatZeit(rest)}`;
    timer.classList.toggle("knapp", rest < 5 * 60_000);
    if (rest === 0) abgeben(true);
  }

  function gehe(i) {
    state.aktuell = Math.max(0, Math.min(n - 1, i));
    uebersicht = false;
    persist();
    zeichne();
    window.scrollTo(0, 0);
  }

  function zeichne() {
    const q = state.fragen[state.aktuell];
    const markiert = state.markiert.includes(q.id);
    fill(main, 
      h("div", { class: "quiz-head" },
        h("span", {}, `Frage ${state.aktuell + 1} von ${n}`),
        h("span", { class: "muted" }, `${n - offen()} beantwortet`)),
      h("div", { class: "progress progress-thin" }, h("span", { style: `width:${((n - offen()) / n) * 100}%` })),
      uebersicht ? h("div", { class: "card" },
        h("h2", {}, "Übersicht"),
        h("div", { class: "grid" }, state.fragen.map((f, i) => h("button", {
          class: ["cell", beantwortet(f) ? "done" : "", state.markiert.includes(f.id) ? "flag" : "", i === state.aktuell ? "current" : ""].join(" ").trim(),
          "aria-label": `Frage ${i + 1}${beantwortet(f) ? ", beantwortet" : ", offen"}${state.markiert.includes(f.id) ? ", markiert" : ""}`,
          onclick: () => gehe(i),
        }, String(i + 1)))),
        h("p", { class: "legende muted" }, "■ beantwortet  □ offen  ⚑ markiert")) : null,
      h("div", { class: "card" }, frageView(q, {
        selected: new Set(state.antworten[q.id] ?? []),
        onChange: (s) => {
          state.antworten[q.id] = [...s];
          persist();
          zeichne();
        },
      })),
      h("div", { class: "actions sticky exam-nav" },
        h("button", { class: "btn", disabled: state.aktuell === 0, onclick: () => gehe(state.aktuell - 1) }, "‹ Zurück"),
        h("button", {
          class: `btn ${markiert ? "btn-flag" : ""}`,
          "aria-pressed": String(markiert),
          onclick: () => {
            state.markiert = markiert ? state.markiert.filter((x) => x !== q.id) : [...state.markiert, q.id];
            persist();
            zeichne();
          },
        }, markiert ? "Markiert" : "Markieren"),
        state.aktuell + 1 < n
          ? h("button", { class: "btn btn-primary", onclick: () => gehe(state.aktuell + 1) }, "Weiter ›")
          : h("button", { class: "btn btn-primary", onclick: () => abgeben() }, "Abgeben")),
      h("div", { class: "actions" },
        h("button", { class: "btn btn-ghost", onclick: () => { uebersicht = !uebersicht; zeichne(); } },
          uebersicht ? "Übersicht schließen" : "Übersicht aller Fragen"),
        h("button", { class: "btn btn-ghost", onclick: () => abgeben() }, "Prüfung abgeben")));
  }

  const bar = topbar("Prüfung", "#/");
  if (state.endsAt != null) bar.append(timer);
  root.append(bar, main);
  zeichne();
  if (state.endsAt != null) {
    tick();
    if (!state.abgegeben) interval = setInterval(tick, 1000);
  }
  return () => clearInterval(interval);
}
