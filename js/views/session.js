import { h, topbar, fill } from "../lib/dom.js";
import { loadIndex, loadSession, allSessions } from "../lib/data.js";
import { getProgress, setResult, load } from "../lib/store.js";
import { shuffle, prepareQuestion, isCorrect } from "../lib/quiz.js";
import { frageView } from "../lib/frage.js";

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
  return { titel: `Tag ${s.tag.nr} · ${s.titel}`, fragen, back: "#/", nurFalsche };
}

export async function render(root, { id, query }) {
  const { titel, fragen, back, nurFalsche } = await quelle(id, query);
  const main = h("div", { class: "page" });
  root.append(topbar(titel, back), main);

  if (fragen.length === 0) {
    main.append(h("div", { class: "card leer" },
      h("p", {}, "Hier gibt es gerade keine Fragen zu wiederholen. Super!"),
      h("a", { class: "btn btn-primary", href: back }, "Zurück")));
    return;
  }

  const runde = shuffle(fragen).map((q) => prepareQuestion(q));
  let i = 0;
  let selected = new Set();
  let geprueft = false;
  const falsch = [];

  function zeigeFrage() {
    const q = runde[i];
    fill(main, 
      h("div", { class: "quiz-head" },
        h("span", {}, `Frage ${i + 1} von ${runde.length}`),
        h("span", { class: "muted" }, `${i + (geprueft ? 1 : 0) - falsch.length} richtig`)),
      h("div", { class: "progress progress-thin" }, h("span", { style: `width:${(i / runde.length) * 100}%` })),
      h("div", { class: "card" }, frageView(q, {
        selected,
        reveal: geprueft,
        onChange: (s) => { selected = s; zeigeFrage(); },
      })),
      h("div", { class: "actions sticky" }, geprueft
        ? h("button", { class: "btn btn-primary", onclick: weiter }, i + 1 < runde.length ? "Weiter" : "Auswertung")
        : h("button", { class: "btn btn-primary", disabled: selected.size === 0, onclick: pruefen }, "Prüfen")));
  }

  function pruefen() {
    const q = runde[i];
    const ok = isCorrect(q, selected);
    setResult(q.id, ok);
    if (!ok) falsch.push(q);
    geprueft = true;
    zeigeFrage();
  }

  function weiter() {
    i++;
    selected = new Set();
    geprueft = false;
    if (i < runde.length) {
      zeigeFrage();
      window.scrollTo(0, 0);
    } else zeigeAuswertung();
  }

  function zeigeAuswertung() {
    const richtig = runde.length - falsch.length;
    const pct = Math.round((richtig / runde.length) * 100);
    const nochmal = () => { root.replaceChildren(); render(root, { id, query }); };
    fill(main, h("div", { class: "card ergebnis-box" },
      h("p", { class: "big" }, `${richtig} von ${runde.length}`),
      h("p", { class: "muted" }, `${pct} % richtig`),
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

  zeigeFrage();
}
