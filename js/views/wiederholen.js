import { h, topbar } from "../lib/dom.js";
import { loadWiederholung, loadWiederholungsquiz } from "../lib/data.js";
import { getProgress } from "../lib/store.js";
import { dashKachel, idsVon } from "./start.js";

// Auswahl der Wiederholungsangebote.
export async function render(root) {
  const progress = getProgress();
  const stand = (ids) => {
    const r = ids.filter((id) => progress[id] === true).length;
    return { stand: `${r}/${ids.length} richtig`, pct: ids.length ? Math.round((r / ids.length) * 100) : 0 };
  };
  const karten = [];
  try {
    const wq = await loadWiederholungsquiz();
    const ids = wq.sessions.flatMap(idsVon);
    karten.push(dashKachel({ href: "#/wiederholungsquiz", icon: "★", variante: "wiederholung", titel: wq.titel, text: wq.untertitel, ...stand(ids) }));
  } catch { /* fehlt */ }
  try {
    const wdh = await loadWiederholung();
    const ids = wdh.sessions.flatMap(idsVon);
    karten.push(dashKachel({ href: "#/wiederholung", icon: "↻", variante: "vertiefung", titel: wdh.titel, text: wdh.untertitel, ...stand(ids) }));
  } catch { /* fehlt */ }
  root.append(
    topbar("Wiederholung", "#/"),
    h("div", { class: "page" },
      h("p", { class: "muted intro" }, "Wiederhole gezielt das Wichtigste aus dem Unterricht."),
      h("nav", { class: "dash" }, ...karten)));
}
