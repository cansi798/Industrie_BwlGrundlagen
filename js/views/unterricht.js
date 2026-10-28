import { h, topbar, formatDatum } from "../lib/dom.js";
import { loadIndex } from "../lib/data.js";
import { getProgress } from "../lib/store.js";
import { tagStyle } from "../lib/farben.js";
import { sessionKachel } from "./start.js";

// Unterricht: alle Tage mit ihren Sessions (Vormittag/Nachmittag).
export async function render(root) {
  const index = await loadIndex();
  const progress = getProgress();
  root.append(
    topbar("Unterricht", "#/"),
    h("div", { class: "page" },
      h("p", { class: "muted intro" }, "Wähle einen Tag und eine Session. Nach jeder Frage siehst du sofort die Lösung mit Erklärung."),
      h("nav", { class: "sprung", "aria-label": "Zu Tag springen" },
        ...index.teile.flatMap((t) => t.tage).map((tag) =>
          h("a", { class: "sprung-tag", href: `#/unterricht`, style: tagStyle(tag.nr), onclick: (e) => {
            e.preventDefault();
            document.getElementById(tag.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
          } }, String(tag.nr)))),
      ...index.teile.map((teil) => h("section", { class: "teil" },
        h("h2", {}, teil.titel),
        ...teil.tage.map((tag) => h("article", { class: "tag day", id: tag.id, style: tagStyle(tag.nr) },
          h("div", { class: "day-kopf" },
            h("span", { class: "day-nr", "aria-hidden": "true" }, String(tag.nr)),
            h("div", {},
              h("p", { class: "tag-meta" }, `Tag ${tag.nr} · ${formatDatum(tag.datum)}`),
              h("h3", {}, tag.titel))),
          h("div", { class: `kacheln ${tag.sessions.length === 1 ? "einzeln" : ""}` },
            tag.sessions.map((s) => sessionKachel(s, progress)))))))));
}
