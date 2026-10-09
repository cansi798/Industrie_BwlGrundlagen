import { h } from "./lib/dom.js";
import * as start from "./views/start.js";
import * as session from "./views/session.js";
import * as pruefungSetup from "./views/pruefung-setup.js";
import * as pruefung from "./views/pruefung.js";
import * as ergebnis from "./views/ergebnis.js";

const ROUTES = [
  [/^#?\/?$/, start],
  [/^#\/session\/([\w-]+)(?:\?(.*))?$/, session],
  [/^#\/pruefung\/?$/, pruefungSetup],
  [/^#\/pruefung\/laeuft$/, pruefung],
  [/^#\/pruefung\/ergebnis$/, ergebnis],
];

const root = document.getElementById("app");
let cleanup = null;
let navId = 0;
let ersteSeite = true;

async function route() {
  const nav = ++navId;
  if (typeof cleanup === "function") cleanup();
  cleanup = null;
  const hash = location.hash || "#/";
  const match = ROUTES.map(([re, view]) => [hash.match(re), view]).find(([m]) => m);
  if (!match) {
    location.replace("#/");
    return;
  }
  const [m, view] = match;
  // Jede Ansicht rendert in einen eigenen Container; ist inzwischen weiter
  // navigiert worden, wird das späte Ergebnis verworfen.
  const container = h("div", { class: "view" });
  root.replaceChildren(container);
  window.scrollTo(0, 0);
  try {
    const result = await view.render(container, { id: m[1], query: new URLSearchParams(m[2] ?? "") });
    if (nav !== navId) {
      if (typeof result === "function") result();
      return;
    }
    cleanup = result;
    if (!ersteSeite) container.querySelector("h1")?.focus({ preventScroll: true });
    ersteSeite = false;
  } catch (err) {
    if (nav !== navId) return;
    console.error(err);
    root.replaceChildren(h("section", { class: "fehler card" },
      h("h2", {}, "Die Fragen konnten nicht geladen werden."),
      h("p", {}, "Bitte prüfe deine Internetverbindung."),
      h("button", { class: "btn btn-primary", onclick: route }, "Erneut versuchen")));
  }
}

window.addEventListener("hashchange", route);
route();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch((e) => console.warn("Service Worker:", e));
}
