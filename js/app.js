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

async function route() {
  if (typeof cleanup === "function") cleanup();
  cleanup = null;
  const hash = location.hash || "#/";
  const match = ROUTES.map(([re, view]) => [hash.match(re), view]).find(([m]) => m);
  root.replaceChildren();
  window.scrollTo(0, 0);
  if (!match) {
    location.replace("#/");
    return;
  }
  const [m, view] = match;
  try {
    cleanup = await view.render(root, { id: m[1], query: new URLSearchParams(m[2] ?? "") });
  } catch (err) {
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
