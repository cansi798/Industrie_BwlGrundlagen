import { h, formatDatum } from "../lib/dom.js";
import { loadIndex } from "../lib/data.js";
import { getProgress, load } from "../lib/store.js";

function sessionRow(s, progress) {
  const richtig = Array.from({ length: s.anzahl }, (_, i) => `${s.id}-${String(i + 1).padStart(2, "0")}`)
    .filter((id) => progress[id] === true).length;
  const pct = Math.round((richtig / s.anzahl) * 100);
  return h("a", { class: "session", href: `#/session/${s.id}` },
    h("span", { class: "session-titel" }, s.titel),
    h("span", { class: "session-stand" }, `${richtig}/${s.anzahl} richtig`),
    h("span", { class: "progress", role: "progressbar", "aria-valuenow": pct, "aria-valuemin": 0, "aria-valuemax": 100 },
      h("span", { style: `width:${pct}%` })));
}

export async function render(root) {
  const index = await loadIndex();
  const progress = getProgress();
  const laufend = load("pruefung", null);
  const offenePruefung = laufend && !laufend.abgegeben;

  root.append(
    h("header", { class: "hero" },
      h("p", { class: "kicker" }, "Modul M-094"),
      h("h1", { tabindex: "-1" }, "BWL & Recht – Lernapp"),
      h("p", { class: "lead" }, "Übe jede Session mit sofortiger Erklärung oder teste dich im Prüfungssimulator.")),
    h("a", { class: "card card-exam", href: offenePruefung ? "#/pruefung/laeuft" : "#/pruefung" },
      h("span", { class: "card-exam-icon", "aria-hidden": "true" }, "✎"),
      h("span", {},
        h("strong", {}, offenePruefung ? "Prüfung fortsetzen" : "Prüfungssimulator"),
        h("span", { class: "muted" }, offenePruefung
          ? `Frage ${laufend.aktuell + 1} von ${laufend.fragen.length} – weitermachen`
          : "30 Zufallsfragen · wie in der echten Prüfung")),
      h("span", { class: "chev", "aria-hidden": "true" }, "›")),
    ...index.teile.map((teil) => h("section", { class: "teil" },
      h("h2", {}, teil.titel),
      ...teil.tage.map((tag) => h("article", { class: "card tag" },
        h("p", { class: "tag-meta" }, `Tag ${tag.nr} · ${formatDatum(tag.datum)}`),
        h("h3", {}, tag.titel),
        ...tag.sessions.map((s) => sessionRow(s, progress)))))),
    h("footer", { class: "footer muted" }, "Dein Fortschritt wird nur auf diesem Gerät gespeichert."));
}
