import { h, formatDatum } from "../lib/dom.js";
import { loadIndex, loadWiederholung } from "../lib/data.js";
import { getProgress, load } from "../lib/store.js";
import { tagStyle } from "../lib/farben.js";

export function sessionKachel(s, progress, ids) {
  const alleIds = ids ?? Array.from({ length: s.anzahl }, (_, i) => `${s.id}-${String(i + 1).padStart(2, "0")}`);
  const richtig = alleIds.filter((id) => progress[id] === true).length;
  const pct = Math.round((richtig / s.anzahl) * 100);
  const [zeit, ...rest] = s.titel.split(": ");
  return h("a", { class: "kachel", href: `#/session/${s.id}`, "aria-label": `${s.titel}, ${richtig} von ${s.anzahl} richtig` },
    h("span", { class: "kachel-zeit" }, zeit),
    h("span", { class: "kachel-titel" }, rest.join(": ") || zeit),
    h("span", { class: "kachel-stand" }, `${richtig}/${s.anzahl} richtig`),
    h("span", { class: "progress", "aria-hidden": "true" }, h("span", { style: `width:${pct}%` })));
}

export function idsVon(s) {
  return Array.from({ length: s.anzahl }, (_, i) => `${s.id}-${String(i + 1).padStart(2, "0")}`);
}

async function wiederholungKarte(progress) {
  try {
    const w = await loadWiederholung();
    const ids = w.sessions.flatMap(idsVon);
    const richtig = ids.filter((id) => progress[id] === true).length;
    return h("a", { class: "card card-exam card-wdh", href: "#/wiederholung" },
      h("span", { class: "card-exam-icon", "aria-hidden": "true" }, "↻"),
      h("span", {},
        h("strong", {}, w.titel),
        h("span", { class: "muted" }, `${ids.length} Aufgaben · ${richtig}/${ids.length} richtig`)),
      h("span", { class: "chev", "aria-hidden": "true" }, "›"));
  } catch {
    return h("p", { class: "muted" }, "Die Wiederholung konnte nicht geladen werden.");
  }
}

export async function render(root) {
  const index = await loadIndex();
  const progress = getProgress();
  const wiederholung = await wiederholungKarte(progress);
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
    wiederholung,
    ...index.teile.map((teil) => h("section", { class: "teil" },
      h("h2", {}, teil.titel),
      ...teil.tage.map((tag) => h("article", { class: "tag day", style: tagStyle(tag.nr) },
        h("div", { class: "day-kopf" },
          h("span", { class: "day-nr", "aria-hidden": "true" }, String(tag.nr)),
          h("div", {},
            h("p", { class: "tag-meta" }, `Tag ${tag.nr} · ${formatDatum(tag.datum)}`),
            h("h3", {}, tag.titel))),
        h("div", { class: `kacheln ${tag.sessions.length === 1 ? "einzeln" : ""}` },
          tag.sessions.map((s) => sessionKachel(s, progress))))))),
    h("footer", { class: "footer muted" }, "Dein Fortschritt wird nur auf diesem Gerät gespeichert."));
}
