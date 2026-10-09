import { h, topbar, fill, keepFocus } from "../lib/dom.js";
import { loadIndex, loadSession, allSessions } from "../lib/data.js";
import { getProgress, setResult, load, save } from "../lib/store.js";
import { shuffle, prepareQuestion, isCorrect } from "../lib/quiz.js";
import { frageView } from "../lib/frage.js";
import { tagStyle } from "../lib/farben.js";

export const PRUEFUNG_FALSCHE = "pruefung-falsche";

async function quelle(id, query) {
  if (id === PRUEFUNG_FALSCHE) {
    const p = load("pruefung", null);
    const fragen = p ? p.fragen.filter((q) => !isCorrect(q, p.antworten[q.id])) : [];
    return { titel: "Falsche Fragen aus der Prüfung", fragen, back: "#/pruefung/ergebnis" };
  }
  const s = allSessions(await loadIndex()).find((x) => x.id === id);
  if (!s) throw new Error(`Unbekannte Session ${id}`);
  let fragen = await loadSession(id);
  const nurFalsche = query.get("nurFalsche") === "1";
  if (nurFalsche) {
    const p = getProgress();
    fragen = fragen.filter((q) => p[q.id] === false);
  }
  return { titel: `Tag ${s.tag.nr} · ${s.titel}`, fragen, back: "#/", nurFalsche, tagNr: s.tag.nr };
}

export async function render(root, { id, query }) {
  const { titel, fragen, back, nurFalsche, tagNr } = await quelle(id, query);
  const main = h("div", { class: "page" });
  const bar = topbar(titel, back);
  if (tagNr) {
    root.setAttribute("style", tagStyle(tagNr));
    bar.classList.add("day-bar");
  }
  root.append(bar, main);

  if (fragen.length === 0) {
    main.append(h("div", { class: "card leer" },
      h("p", {}, "Hier gibt es gerade keine Fragen zu wiederholen. Super!"),
      h("a", { class: "btn btn-primary", href: back }, "Zurück")));
    return;
  }

  const runde = shuffle(fragen).map((q) => prepareQuestion(q));
  const n = runde.length;
  const auswahl = new Map(); // frageId → Set gewählter Indizes
  const ergebnis = new Map(); // frageId → true/false, sobald geprüft
  let i = 0;
  let ansicht = load("uebung.ansicht", "einzeln") === "liste" ? "liste" : "einzeln";
  let fertig = false;

  const gewaehlt = (q) => auswahl.get(q.id) ?? new Set();
  const richtigAnzahl = () => [...ergebnis.values()].filter(Boolean).length;
  const offenIndex = () => runde.findIndex((q) => !ergebnis.has(q.id));

  function pruefe(q) {
    const ok = isCorrect(q, gewaehlt(q));
    ergebnis.set(q.id, ok);
    setResult(q.id, ok);
  }

  function umschalter() {
    return h("div", { class: "segmented", role: "group", "aria-label": "Ansicht" },
      [["einzeln", "Eine pro Seite"], ["liste", "Alle untereinander"]].map(([key, label]) => h("button", {
        type: "button",
        "aria-pressed": String(ansicht === key),
        "data-focus": `ansicht:${key}`,
        onclick: () => {
          if (ansicht === key) return;
          ansicht = key;
          save("uebung.ansicht", key);
          keepFocus(zeichne);
          if (key === "liste") springeZu(i, "auto");
          else window.scrollTo(0, 0);
        },
      }, label)));
  }

  /* ---------- eine Frage pro Seite ---------- */

  function zeichneEinzeln() {
    const q = runde[i];
    const geprueft = ergebnis.has(q.id);
    const sel = gewaehlt(q);
    fill(main,
      umschalter(),
      h("div", { class: "quiz-head" },
        h("span", {}, `Frage ${i + 1} von ${n}`),
        h("span", { class: "muted" }, `${richtigAnzahl()} richtig`)),
      h("div", { class: "progress progress-thin" }, h("span", { style: `width:${(ergebnis.size / n) * 100}%` })),
      h("div", { class: "card" }, frageView(q, {
        selected: sel,
        reveal: geprueft,
        onChange: (s) => { auswahl.set(q.id, s); keepFocus(zeichne); },
      })),
      h("div", { class: "actions sticky" }, geprueft
        ? h("button", { class: "btn btn-primary", "data-focus": "next", onclick: weiter }, offenIndex() === -1 ? "Auswertung" : "Weiter")
        : h("button", { class: "btn btn-primary", "data-focus": "next", disabled: sel.size === 0, onclick: () => { pruefe(q); keepFocus(zeichne); } }, "Prüfen")));
  }

  function weiter() {
    // nächste ungeprüfte Frage nach der aktuellen, sonst die erste ungeprüfte
    const danach = runde.findIndex((q, k) => k > i && !ergebnis.has(q.id));
    const naechste = danach !== -1 ? danach : offenIndex();
    if (naechste === -1) return zeigeAuswertung();
    i = naechste;
    zeichne();
    window.scrollTo(0, 0);
  }

  /* ---------- alle Fragen untereinander ---------- */

  function karte(q, k) {
    const geprueft = ergebnis.has(q.id);
    const sel = gewaehlt(q);
    return h("article", { class: `card frage-karte ${geprueft ? (ergebnis.get(q.id) ? "ok" : "bad") : ""}`, id: `frage-${k + 1}` },
      h("div", { class: "karte-kopf" }, h("span", { class: "karte-nr" }, `Frage ${k + 1}`)),
      frageView(q, {
        selected: sel,
        reveal: geprueft,
        onChange: (s) => { auswahl.set(q.id, s); i = k; ersetzeKarte(q, k); },
      }),
      geprueft ? null : h("div", { class: "karte-aktion" },
        h("button", {
          class: "btn btn-primary", "data-focus": `pruefen:${q.id}`, disabled: sel.size === 0,
          onclick: () => { pruefe(q); i = k; ersetzeKarte(q, k, true); },
        }, "Prüfen")));
  }

  function ersetzeKarte(q, k, fokusAufKarte = false) {
    const alt = document.getElementById(`frage-${k + 1}`);
    const neu = karte(q, k);
    keepFocus(() => alt?.replaceWith(neu));
    // Nach dem Prüfen verschwindet der Knopf – Fokus auf die Erklärung setzen
    const expl = fokusAufKarte ? neu.querySelector(".expl") : null;
    if (expl) {
      expl.setAttribute("tabindex", "-1");
      expl.focus({ preventScroll: true });
    }
    standUnten.textContent = standText();
  }

  function standText() {
    return `${ergebnis.size} von ${n} geprüft · ${richtigAnzahl()} richtig`;
  }
  const standUnten = h("span", { class: "muted stand-unten" });

  function springeZu(k, behavior = "smooth") {
    requestAnimationFrame(() => document.getElementById(`frage-${k + 1}`)?.scrollIntoView({ behavior, block: "start" }));
  }

  function zeichneListe() {
    standUnten.textContent = standText();
    fill(main,
      umschalter(),
      runde.map((q, k) => karte(q, k)),
      h("div", { class: "actions sticky exam-nav" },
        standUnten,
        h("button", {
          class: "btn btn-primary",
          onclick: () => {
            const offen = n - ergebnis.size;
            if (ergebnis.size === 0) return alert("Prüfe zuerst mindestens eine Frage.");
            if (offen > 0 && !confirm(`${offen} ${offen === 1 ? "Frage ist" : "Fragen sind"} noch nicht geprüft. Trotzdem auswerten?`)) return;
            zeigeAuswertung();
          },
        }, "Auswertung")));
  }

  function zeichne() {
    if (fertig) return;
    if (ansicht === "liste") zeichneListe();
    else zeichneEinzeln();
  }

  function zeigeAuswertung() {
    fertig = true;
    const geprueft = ergebnis.size;
    const richtig = richtigAnzahl();
    const falsch = runde.filter((q) => ergebnis.get(q.id) === false);
    const pct = Math.round((richtig / geprueft) * 100);
    const nochmal = () => { root.replaceChildren(); render(root, { id, query }); };
    fill(main, h("div", { class: "card ergebnis-box" },
      h("p", { class: "big" }, `${richtig} von ${geprueft}`),
      h("p", { class: "muted" }, `${pct} % richtig${geprueft < n ? ` · ${n - geprueft} nicht geprüft` : ""}`),
      h("div", { class: "progress" }, h("span", { style: `width:${pct}%` })),
      h("div", { class: "actions stack" },
        falsch.length && id !== PRUEFUNG_FALSCHE
          ? (nurFalsche
            ? h("button", { class: "btn btn-primary", onclick: nochmal }, `Nur falsche wiederholen (${falsch.length})`)
            : h("a", { class: "btn btn-primary", href: `#/session/${id}?nurFalsche=1` }, `Nur falsche wiederholen (${falsch.length})`))
          : null,
        h("button", { class: "btn", onclick: nochmal }, "Nochmal von vorn"),
        h("a", { class: "btn", href: back }, "Zur Übersicht"))));
    window.scrollTo(0, 0);
  }

  zeichne();
}
