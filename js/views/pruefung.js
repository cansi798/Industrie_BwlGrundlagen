import { h, topbar, fill, keepFocus } from "../lib/dom.js";
import { load, save } from "../lib/store.js";
import { restTime } from "../lib/quiz.js";
import { frageView } from "../lib/frage.js";

const ANSICHTEN = { einzeln: "Eine pro Seite", liste: "Alle untereinander" };

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
  let ansicht = load("pruefung.ansicht", "einzeln") === "liste" ? "liste" : "einzeln";
  let uebersicht = false;
  let interval = null;
  // Fortschrittsanzeige wird in der Listenansicht ohne Neuzeichnen aktualisiert
  let standElemente = [];

  const persist = () => save("pruefung", state);
  const beantwortet = (q) => (state.antworten[q.id]?.length ?? 0) > 0;
  const offen = () => state.fragen.filter((q) => !beantwortet(q)).length;
  const zeitUm = () => state.endsAt != null && restTime(state.endsAt, Date.now()) === 0;

  function abgeben(automatisch = false) {
    if (state.abgegeben) return;
    if (!automatisch) {
      const o = offen();
      if (o > 0 && !confirm(`${o} ${o === 1 ? "Frage ist" : "Fragen sind"} noch offen. Trotzdem abgeben?`)) return;
      // Während der Rückfrage kann die Zeit abgelaufen sein
      if (zeitUm()) automatisch = true;
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

  function antworte(q, s) {
    state.antworten[q.id] = [...s];
    state.aktuell = state.fragen.indexOf(q);
    persist();
  }

  function toggleMarkiert(q) {
    state.markiert = state.markiert.includes(q.id) ? state.markiert.filter((x) => x !== q.id) : [...state.markiert, q.id];
    persist();
  }

  function stand() {
    const fertig = n - offen();
    const text = h("span", { class: "muted" }, `${fertig} von ${n} beantwortet`);
    const bar = h("div", { class: "progress progress-thin" }, h("span", { style: `width:${(fertig / n) * 100}%` }));
    standElemente = [text, bar];
    return [text, bar];
  }

  function aktualisiereStand() {
    const fertig = n - offen();
    const [text, bar] = standElemente;
    text.textContent = `${fertig} von ${n} beantwortet`;
    bar.firstChild.style.width = `${(fertig / n) * 100}%`;
    document.querySelectorAll("[data-stand]").forEach((el) => (el.textContent = `${fertig} von ${n} beantwortet`));
    zeichneUebersicht();
  }

  function umschalter() {
    return h("div", { class: "segmented", role: "group", "aria-label": "Ansicht" },
      Object.entries(ANSICHTEN).map(([key, label]) => h("button", {
        type: "button",
        "aria-pressed": String(ansicht === key),
        "data-focus": `ansicht:${key}`,
        onclick: () => {
          if (ansicht === key) return;
          ansicht = key;
          save("pruefung.ansicht", key);
          keepFocus(zeichne);
          if (key === "liste") springeZu(state.aktuell, "auto");
          else window.scrollTo(0, 0);
        },
      }, label)));
  }

  const uebersichtBox = h("div", { class: "card", id: "uebersicht" });

  function zeichneUebersicht() {
    if (!uebersicht) {
      uebersichtBox.hidden = true;
      return;
    }
    uebersichtBox.hidden = false;
    fill(uebersichtBox,
      h("h2", {}, "Übersicht"),
      h("div", { class: "grid" }, state.fragen.map((f, i) => h("button", {
        class: ["cell", beantwortet(f) ? "done" : "", state.markiert.includes(f.id) ? "flag" : "",
          ansicht === "einzeln" && i === state.aktuell ? "current" : ""].join(" ").trim(),
        "aria-label": `Frage ${i + 1}${beantwortet(f) ? ", beantwortet" : ", offen"}${state.markiert.includes(f.id) ? ", markiert" : ""}`,
        onclick: () => (ansicht === "einzeln" ? gehe(i) : springeZu(i)),
      }, String(i + 1)))),
      h("p", { class: "legende muted" }, "■ beantwortet  □ offen  ⚑ markiert"));
  }

  function uebersichtKnopf() {
    return h("button", {
      class: "btn btn-ghost", "data-focus": "uebersicht",
      onclick: () => { uebersicht = !uebersicht; keepFocus(zeichne); },
    }, uebersicht ? "Übersicht schließen" : "Übersicht aller Fragen");
  }

  /* ---------- Ansicht: eine Frage pro Seite ---------- */

  function gehe(i) {
    state.aktuell = Math.max(0, Math.min(n - 1, i));
    uebersicht = false;
    persist();
    zeichne();
    window.scrollTo(0, 0);
  }

  function zeichneEinzeln() {
    const q = state.fragen[state.aktuell];
    const markiert = state.markiert.includes(q.id);
    const [text, bar] = stand();
    fill(main,
      umschalter(),
      h("div", { class: "quiz-head" }, h("span", {}, `Frage ${state.aktuell + 1} von ${n}`), text),
      bar,
      uebersichtBox,
      h("div", { class: "card" }, frageView(q, {
        selected: new Set(state.antworten[q.id] ?? []),
        onChange: (s) => { antworte(q, s); keepFocus(zeichne); },
      })),
      h("div", { class: "actions sticky exam-nav" },
        h("button", { class: "btn", "data-focus": "zurueck", disabled: state.aktuell === 0, onclick: () => gehe(state.aktuell - 1) }, "‹ Zurück"),
        h("button", {
          class: `btn ${markiert ? "btn-flag" : ""}`,
          "aria-pressed": String(markiert),
          "data-focus": "markieren",
          onclick: () => { toggleMarkiert(q); keepFocus(zeichne); },
        }, markiert ? "Markiert" : "Markieren"),
        state.aktuell + 1 < n
          ? h("button", { class: "btn btn-primary", "data-focus": "weiter", onclick: () => gehe(state.aktuell + 1) }, "Weiter ›")
          : h("button", { class: "btn btn-primary", "data-focus": "weiter", onclick: () => abgeben() }, "Abgeben")),
      h("div", { class: "actions" },
        uebersichtKnopf(),
        h("button", { class: "btn btn-ghost", onclick: () => abgeben() }, "Prüfung abgeben")));
    zeichneUebersicht();
  }

  /* ---------- Ansicht: alle Fragen untereinander ---------- */

  function karte(q, i) {
    const markiert = state.markiert.includes(q.id);
    const el = h("article", { class: `card frage-karte ${beantwortet(q) ? "beantwortet" : ""}`, id: `frage-${i + 1}` },
      h("div", { class: "karte-kopf" },
        h("span", { class: "karte-nr" }, `Frage ${i + 1}`),
        h("button", {
          type: "button",
          class: `btn-mini ${markiert ? "aktiv" : ""}`,
          "aria-pressed": String(markiert),
          "aria-label": `Frage ${i + 1} markieren`,
          "data-focus": `flag:${q.id}`,
          onclick: () => { toggleMarkiert(q); ersetzeKarte(q, i); },
        }, markiert ? "⚑ Markiert" : "⚐ Markieren")),
      frageView(q, {
        selected: new Set(state.antworten[q.id] ?? []),
        onChange: (s) => { antworte(q, s); ersetzeKarte(q, i); },
      }));
    return el;
  }

  function ersetzeKarte(q, i) {
    const alt = document.getElementById(`frage-${i + 1}`);
    keepFocus(() => alt?.replaceWith(karte(q, i)));
    aktualisiereStand();
  }

  function springeZu(i, behavior = "smooth") {
    state.aktuell = i;
    persist();
    requestAnimationFrame(() => document.getElementById(`frage-${i + 1}`)?.scrollIntoView({ behavior, block: "start" }));
  }

  function zeichneListe() {
    const [text, bar] = stand();
    fill(main,
      umschalter(),
      h("div", { class: "quiz-head" }, h("span", {}, `${n} Fragen`), text),
      bar,
      h("div", { class: "actions" }, uebersichtKnopf()),
      uebersichtBox,
      state.fragen.map((q, i) => karte(q, i)),
      h("div", { class: "actions sticky exam-nav" },
        h("span", { class: "muted stand-unten", "data-stand": "" }, `${n - offen()} von ${n} beantwortet`),
        h("button", { class: "btn btn-primary", onclick: () => abgeben() }, "Prüfung abgeben")));
    zeichneUebersicht();
  }

  function zeichne() {
    if (ansicht === "liste") zeichneListe();
    else zeichneEinzeln();
  }

  const bar = topbar("Prüfung", "#/");
  if (state.endsAt != null) bar.append(timer);
  root.append(bar, main);
  zeichne();
  if (ansicht === "liste" && state.aktuell > 0) springeZu(state.aktuell, "auto");
  if (state.endsAt != null) {
    tick();
    if (!state.abgegeben) interval = setInterval(tick, 1000);
  }
  return () => clearInterval(interval);
}
