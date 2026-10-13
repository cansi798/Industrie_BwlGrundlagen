import { h, topbar } from "../lib/dom.js";
import { loadWiederholung, WDH_ALLE } from "../lib/data.js";
import { getProgress } from "../lib/store.js";
import { tagStyle } from "../lib/farben.js";
import { sessionKachel, idsVon } from "./start.js";

// Übersicht der Wiederholung: eine Kachel je Tag und „Alle gemischt“.
export async function render(root) {
  const w = await loadWiederholung();
  const progress = getProgress();
  const alleIds = w.sessions.flatMap(idsVon);
  const alle = { id: WDH_ALLE, titel: "Alle Tage: Alle 200 gemischt", anzahl: alleIds.length };
  const mitFarbe = (k, nr) => {
    k.setAttribute("style", tagStyle(nr));
    return k;
  };

  root.append(
    topbar(w.titel, "#/"),
    h("div", { class: "page" },
      h("section", { class: "teil wiederholung" },
        h("p", { class: "muted" }, w.untertitel),
        h("div", { class: "kacheln" },
          ...w.sessions.map((s) => mitFarbe(sessionKachel(s, progress), s.tagNr)),
          mitFarbe(sessionKachel(alle, progress, alleIds), 0)))));
}
