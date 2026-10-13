import { h } from "./dom.js";
import { isCorrect, parseZahl } from "./quiz.js";
import { angabenBox } from "./frage.js";

const BEWERTUNG = [
  ["gewusst", "Gewusst"],
  ["teilweise", "Teilweise"],
  ["nicht", "Nicht gewusst"],
];

/**
 * Darstellung für typ "rechnen" und "offen".
 * Rechnen: { selected: string, onChange(text), reveal }
 * Offen:   { selected, text, onText(text), aufgedeckt, onBewerten(wert), reveal }
 * Eingaben lösen kein Neuzeichnen aus; die Ansicht meldet sich per Ereignis ("eingabe", "absenden").
 */
export function aufgabeView(q, opts = {}) {
  return q.typ === "offen" ? offenView(q, opts) : rechnenView(q, opts);
}

function rechnenView(q, { selected = "", onChange = null, reveal = false } = {}) {
  const inputId = `eingabe-${q.id}`;
  const text = typeof selected === "string" ? selected : "";
  const hinweis = h("p", { class: "hint", hidden: text.trim() === "" || parseZahl(text) !== null, id: `hinweis-${q.id}` }, "Bitte eine Zahl eingeben, z. B. 12,5");
  const input = h("input", {
    id: inputId,
    type: "text",
    inputmode: "decimal",
    autocomplete: "off",
    "data-focus": `eingabe:${q.id}`,
    "aria-describedby": hinweis.id,
    readonly: reveal || !onChange,
    onkeydown: (e) => {
      if (e.key === "Enter" && !reveal) {
        e.preventDefault();
        input.dispatchEvent(new CustomEvent("absenden", { bubbles: true }));
      }
    },
    oninput: () => {
      const gueltig = parseZahl(input.value) !== null;
      hinweis.hidden = gueltig || input.value.trim() === "";
      if (onChange) onChange(input.value);
      input.dispatchEvent(new CustomEvent("eingabe", { bubbles: true, detail: { gueltig } }));
    },
  });
  input.value = text;

  const kopf = [
    angabenBox(q),
    h("p", { class: "frage-text" }, q.q),
    h("label", { for: inputId }, "Dein Ergebnis"),
    h("div", { class: "zahl-eingabe" }, input, q.einheit ? h("span", { class: "einheit" }, q.einheit) : null),
    hinweis,
  ];

  let ergebnis = null;
  if (reveal) {
    const beantwortet = parseZahl(text) !== null;
    const ok = beantwortet && isCorrect(q, text);
    const lsg = q.loesung.toLocaleString("de-DE", { maximumFractionDigits: 2 }) + (q.einheit ? " " + q.einheit : "");
    ergebnis = h("div", { class: `expl ${ok ? "expl-ok" : "expl-bad"}`, role: "status" },
      h("strong", {}, ok ? "Richtig!" : beantwortet ? "Leider falsch." : "Nicht beantwortet."),
      h("p", {}, `Lösung: ${lsg}`),
      h("ol", { class: "schritte" }, (q.schritte ?? []).map((s) => h("li", {}, s))),
      h("p", {}, q.expl));
  }
  return h("div", { class: "frage" }, ...kopf, ergebnis);
}

function offenView(q, { selected, text = "", onText = null, aufgedeckt = false, onBewerten = null, reveal = false } = {}) {
  const areaId = `text-${q.id}`;
  const area = h("textarea", {
    id: areaId,
    rows: 4,
    "data-focus": `text:${q.id}`,
    readonly: reveal || !onText,
    oninput: () => {
      if (onText) onText(area.value);
      area.dispatchEvent(new CustomEvent("eingabe", { bubbles: true, detail: { gueltig: parseZahl(area.value) !== null } }));
    },
  });
  area.value = text ?? "";

  let loesung = null;
  if (aufgedeckt || reveal) {
    loesung = h("div", { class: "loesung" },
      h("span", { class: "angaben-titel" }, "Das gehört in eine gute Antwort:"),
      h("ul", {}, (q.kernpunkte ?? []).map((k) => h("li", {}, k))),
      h("p", {}, q.expl));
  }

  let unten = null;
  if (reveal) {
    const label = (BEWERTUNG.find(([w]) => w === selected) ?? [])[1];
    const ok = selected === "gewusst";
    unten = h("div", { class: `expl ${ok ? "expl-ok" : "expl-bad"}`, role: "status" },
      h("strong", {}, label ? `Deine Einschätzung: ${label}` : "Nicht bewertet."));
  } else if (aufgedeckt) {
    unten = h("div", { class: "segmented drei", role: "group", "aria-label": "Wie gut wusstest du es?" },
      BEWERTUNG.map(([wert, label]) => h("button", {
        type: "button",
        "aria-pressed": String(selected === wert),
        "data-focus": `bewerten:${q.id}:${wert}`,
        onclick: onBewerten ? () => onBewerten(wert) : null,
      }, label)));
  }

  return h("div", { class: "frage" },
    h("p", { class: "frage-text" }, q.q),
    h("label", { for: areaId }, "Deine Antwort (wird nicht gespeichert)"),
    area, loesung, unten);
}
