import { h, topbar } from "../lib/dom.js";
import { loadWiederholungsquiz, WQ_ALLE } from "../lib/data.js";
import { getProgress } from "../lib/store.js";
import { tagStyle } from "../lib/farben.js";
import { sessionKachel, idsVon } from "./start.js";

// Wiederholungsquiz: 10 Kernfragen je Tag und alle gemischt.
export async function render(root) {
  const wq = await loadWiederholungsquiz();
  const progress = getProgress();
  const alleIds = wq.sessions.flatMap(idsVon);
  const alle = { id: WQ_ALLE, titel: `Alle Tage: Alle ${alleIds.length} gemischt`, anzahl: alleIds.length };
  const mitFarbe = (k, nr) => {
    k.setAttribute("style", tagStyle(nr));
    return k;
  };
  const falsch = alleIds.filter((id) => progress[id] === false).length;
  root.append(
    topbar(wq.titel, "#/wiederholen"),
    h("div", { class: "page" },
      h("section", { class: "teil wiederholung" },
        h("p", { class: "muted" }, wq.untertitel),
        h("div", { class: "kacheln" },
          mitFarbe(sessionKachel(alle, progress, alleIds), 0),
          ...wq.sessions.map((s) => mitFarbe(sessionKachel(s, progress), s.tagNr))),
        falsch ? h("p", { class: "nur-falsche" },
          h("a", { class: "btn", href: `#/session/${WQ_ALLE}?nurFalsche=1` }, `Nur die ${falsch} falschen Fragen üben`)) : null)));
}
