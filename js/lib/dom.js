// Kleiner Element-Baukasten: Texte immer als textContent, nie als HTML.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "style") el.style.cssText = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Wie el.replaceChildren, ignoriert aber null/false. */
export function fill(el, ...children) {
  el.replaceChildren(...children.flat().filter((c) => c != null && c !== false));
}

export function topbar(title, back = "#/") {
  return h("header", { class: "topbar" },
    back ? h("a", { class: "back", href: back, "aria-label": "Zurück" }, "‹") : null,
    h("h1", {}, title));
}

export function formatDatum(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}
