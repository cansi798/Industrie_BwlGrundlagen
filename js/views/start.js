import { h } from "../lib/dom.js";
import { loadIndex, loadWiederholung, loadWiederholungsquiz, allSessions } from "../lib/data.js";
import { getProgress, load } from "../lib/store.js";

export function idsVon(s) {
  return s.ids ?? Array.from({ length: s.anzahl }, (_, i) => `${s.id}-${String(i + 1).padStart(2, "0")}`);
}

export function sessionKachel(s, progress, ids) {
  const alleIds = ids ?? idsVon(s);
  const richtig = alleIds.filter((id) => progress[id] === true).length;
  const pct = Math.round((richtig / s.anzahl) * 100);
  const [zeit, ...rest] = s.titel.split(": ");
  return h("a", { class: "kachel", href: `#/session/${s.id}`, "aria-label": `${s.titel}, ${richtig} von ${s.anzahl} richtig` },
    h("span", { class: "kachel-zeit" }, zeit),
    h("span", { class: "kachel-titel" }, rest.join(": ") || zeit),
    h("span", { class: "kachel-stand" }, `${richtig}/${s.anzahl} richtig`),
    h("span", { class: "progress", "aria-hidden": "true" }, h("span", { style: `width:${pct}%` })));
}

/** Große Kachel auf dem Dashboard. */
export function dashKachel({ href, icon, titel, text, stand, pct, variante }) {
  return h("a", { class: `dash-kachel dash-${variante}`, href },
    h("span", { class: "dash-icon", "aria-hidden": "true" }, icon),
    h("span", { class: "dash-text" },
      h("strong", {}, titel),
      h("span", { class: "dash-beschreibung" }, text)),
    stand ? h("span", { class: "dash-stand" }, stand) : null,
    pct != null ? h("span", { class: "progress", "aria-hidden": "true" }, h("span", { style: `width:${pct}%` })) : null,
    h("span", { class: "dash-pfeil", "aria-hidden": "true" }, "›"));
}

function zaehle(ids, progress) {
  const richtig = ids.filter((id) => progress[id] === true).length;
  return { richtig, gesamt: ids.length, pct: ids.length ? Math.round((richtig / ids.length) * 100) : 0 };
}

export async function render(root) {
  const index = await loadIndex();
  const progress = getProgress();
  const sessions = allSessions(index);
  const tage = index.teile.reduce((n, t) => n + t.tage.length, 0);
  const u = zaehle(sessions.flatMap(idsVon), progress);

  let wdhIds = [];
  try {
    const [wq, wdh] = await Promise.all([loadWiederholungsquiz(), loadWiederholung()]);
    wdhIds = [...wq.sessions.flatMap(idsVon), ...wdh.sessions.flatMap(idsVon)];
  } catch { /* Wiederholung optional */ }
  const w = zaehle([...new Set(wdhIds)], progress);

  const laufend = load("pruefung", null);
  const offen = laufend && !laufend.abgegeben;

  root.append(
    h("header", { class: "hero" },
      h("p", { class: "kicker" }, "Modul M-094 · Industriekaufleute"),
      h("h1", { tabindex: "-1" }, "BWL & Recht – Lernapp"),
      h("p", { class: "lead" }, "Wähle aus, was du machen möchtest.")),
    h("nav", { class: "dash", "aria-label": "Bereiche" },
      dashKachel({
        href: "#/unterricht", icon: "📚", variante: "unterricht",
        titel: "Unterricht",
        text: `Alle ${tage} Tage und ${sessions.length} Sessions · Fragen mit Erklärung üben`,
        stand: `${u.richtig}/${u.gesamt} richtig`, pct: u.pct,
      }),
      dashKachel({
        href: offen ? "#/pruefung/laeuft" : "#/pruefung", icon: "✎", variante: "pruefung",
        titel: offen ? "Prüfung fortsetzen" : "Prüfungssimulation",
        text: offen ? `Frage ${laufend.aktuell + 1} von ${laufend.fragen.length} – weitermachen`
          : "30 Zufallsfragen aus frei wählbaren Tagen · wie in der echten Klausur",
      }),
      dashKachel({
        href: "#/wiederholen", icon: "↻", variante: "wiederholung",
        titel: "Wiederholung",
        text: "Die wichtigsten Fragen je Tag und vertiefende Aufgaben für die Klausur",
        stand: w.gesamt ? `${w.richtig}/${w.gesamt} richtig` : null, pct: w.gesamt ? w.pct : null,
      })),
    h("footer", { class: "footer muted" }, "Dein Fortschritt wird nur auf diesem Gerät gespeichert."));
}
