import { h, topbar, fill } from "../lib/dom.js";
import { load, remove } from "../lib/store.js";
import { score, isCorrect, PRUEFUNG } from "../lib/quiz.js";
import { frageView } from "../lib/frage.js";

export async function render(root) {
  const state = load("pruefung", null);
  if (!state || !state.abgegeben) {
    location.replace(state ? "#/pruefung/laeuft" : "#/pruefung");
    return;
  }

  const r = score(state.fragen, state.antworten);
  const proTag = new Map();
  for (const q of state.fragen) {
    const t = proTag.get(q.tagId) ?? { titel: q.tagTitel, richtig: 0, gesamt: 0 };
    t.gesamt++;
    if (isCorrect(q, state.antworten[q.id])) t.richtig++;
    proTag.set(q.tagId, t);
  }
  const falsche = state.fragen.filter((q) => !isCorrect(q, state.antworten[q.id]));
  let nurFalsche = false;
  const liste = h("div", { class: "liste" });

  function zeichneListe() {
    const zeigen = nurFalsche ? falsche : state.fragen;
    fill(liste, ...zeigen.map((q) => {
      const nr = state.fragen.indexOf(q) + 1;
      return h("article", { class: "card" },
        h("p", { class: "tag-meta" }, `Frage ${nr} · ${q.tagTitel}`),
        frageView(q, { selected: new Set(state.antworten[q.id] ?? []), reveal: true }));
    }));
    filter.forEach((b, i) => b.setAttribute("aria-pressed", String(i === (nurFalsche ? 1 : 0))));
  }

  const filter = [
    h("button", { class: "chip", onclick: () => { nurFalsche = false; zeichneListe(); } }, `Alle (${state.fragen.length})`),
    h("button", { class: "chip", onclick: () => { nurFalsche = true; zeichneListe(); } }, `Nur falsche (${falsche.length})`),
  ];

  root.append(
    topbar("Prüfungsergebnis", "#/"),
    h("div", { class: "page" },
      h("div", { class: `card ergebnis-box ${r.bestanden ? "pass" : "fail"}` },
        h("p", { class: "verdict" }, r.bestanden ? "Bestanden" : "Nicht bestanden"),
        h("p", { class: "big" }, `${r.punkte} von ${r.gesamt} Punkten`),
        h("p", { class: "muted" }, `${r.prozent} % · bestanden ab ${PRUEFUNG.bestehen} %`),
        state.automatisch ? h("p", { class: "muted" }, "Die Zeit ist abgelaufen – die Prüfung wurde automatisch abgegeben.") : null,
        h("div", { class: "actions stack" },
          h("button", { class: "btn btn-primary", onclick: () => { remove("pruefung"); location.hash = "#/pruefung"; } }, "Neue Prüfung"),
          falsche.length ? h("a", { class: "btn", href: "#/session/pruefung-falsche" }, `Falsche Fragen üben (${falsche.length})`) : null)),
      h("div", { class: "card" },
        h("h2", {}, "Ergebnis nach Themen"),
        h("table", { class: "tabelle" },
          h("tbody", {}, [...proTag.values()].map((t) => h("tr", {},
            h("td", {}, t.titel),
            h("td", { class: `zahl ${t.richtig === t.gesamt ? "ok" : t.richtig === 0 ? "bad" : ""}` }, `${t.richtig}/${t.gesamt}`)))))),
      h("h2", { class: "abschnitt" }, "Lösungen mit Erklärung"),
      h("div", { class: "chips" }, filter),
      liste));
  zeichneListe();
}
