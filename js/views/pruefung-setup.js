import { h, topbar, fill, keepFocus } from "../lib/dom.js";
import { loadIndex, loadSession, allDays } from "../lib/data.js";
import { load, save, remove } from "../lib/store.js";
import { drawExam, prepareQuestion, PRUEFUNG } from "../lib/quiz.js";

export async function startPruefung(index, tagIds, zeitlimit) {
  const tage = allDays(index).filter((d) => tagIds.includes(d.id));
  const poolByDay = {};
  for (const tag of tage) {
    const listen = await Promise.all(tag.sessions.map((s) => loadSession(s.id)));
    poolByDay[tag.id] = listen.flat().map((q) => ({ ...q, tagId: tag.id, tagTitel: `Tag ${tag.nr}: ${tag.titel}` }));
  }
  const fragen = drawExam(poolByDay, PRUEFUNG.fragen).map((q) => prepareQuestion(q));
  save("pruefung", {
    fragen,
    antworten: {},
    markiert: [],
    aktuell: 0,
    endsAt: zeitlimit ? Date.now() + PRUEFUNG.minuten * 60_000 : null,
    abgegeben: false,
  });
  // Nur weiterleiten, wenn man noch auf der Einstellungsseite ist
  if (location.hash.startsWith("#/pruefung")) location.hash = "#/pruefung/laeuft";
}

export async function render(root) {
  const index = await loadIndex();
  const tage = allDays(index);
  const gespeichert = load("pruefung.setup", null);
  const setup = {
    tage: new Set(gespeichert?.tage?.filter((id) => tage.some((d) => d.id === id)) ?? tage.map((d) => d.id)),
    zeitlimit: gespeichert?.zeitlimit ?? true,
  };
  const laufend = load("pruefung", null);
  const main = h("div", { class: "page" });
  root.append(topbar("Prüfungssimulator"), main);
  let startet = false;

  function persist() {
    save("pruefung.setup", { tage: [...setup.tage], zeitlimit: setup.zeitlimit });
  }

  function waehle(filter) {
    setup.tage = new Set(tage.filter(filter).map((d) => d.id));
    persist();
    keepFocus(zeichne);
  }

  function zeichne() {
    const pool = tage.filter((d) => setup.tage.has(d.id)).reduce((n, d) => n + d.sessions.reduce((m, s) => m + s.anzahl, 0), 0);
    fill(main, 
      laufend && !laufend.abgegeben ? h("div", { class: "card hinweis" },
        h("p", {}, h("strong", {}, "Du hast eine laufende Prüfung. "),
          `Frage ${laufend.aktuell + 1} von ${laufend.fragen.length}.`),
        h("div", { class: "actions" },
          h("a", { class: "btn btn-primary", href: "#/pruefung/laeuft" }, "Fortsetzen"),
          h("button", { class: "btn", onclick: () => { if (confirm("Laufende Prüfung wirklich verwerfen? Deine Antworten gehen verloren.")) { remove("pruefung"); location.reload(); } } }, "Verwerfen"))) : null,
      h("div", { class: "card" },
        h("h2", {}, "So läuft die Prüfung"),
        h("ul", { class: "regeln" },
          h("li", {}, `${PRUEFUNG.fragen} Zufallsfragen aus den gewählten Tagen, gleichmäßig verteilt`),
          h("li", {}, "Antworten in zufälliger Reihenfolge, manchmal sind mehrere richtig"),
          h("li", {}, "Kein Feedback während der Prüfung – erst am Ende"),
          h("li", {}, `Bestanden ab ${PRUEFUNG.bestehen} %, jede Frage zählt nur, wenn sie ganz richtig ist`))),
      h("div", { class: "card" },
        h("h2", {}, "Themen wählen"),
        h("div", { class: "chips" },
          h("button", { class: "chip", "data-focus": "chip:Teil 1 BWL", onclick: () => waehle((d) => d.teil === "teil1") }, "Teil 1 BWL"),
          h("button", { class: "chip", "data-focus": "chip:Teil 2 Recht", onclick: () => waehle((d) => d.teil === "teil2") }, "Teil 2 Recht"),
          h("button", { class: "chip", "data-focus": "chip:Alle", onclick: () => waehle(() => true) }, "Alle"),
          h("button", { class: "chip", "data-focus": "chip:Keine", onclick: () => waehle(() => false) }, "Keine")),
        h("div", { class: "checks" }, tage.map((d) => h("label", { class: "check" },
          h("input", {
            type: "checkbox", checked: setup.tage.has(d.id), "data-focus": `tag:${d.id}`,
            onchange: (e) => { e.target.checked ? setup.tage.add(d.id) : setup.tage.delete(d.id); persist(); keepFocus(zeichne); },
          }),
          h("span", {}, h("b", {}, `Tag ${d.nr}`), " ", d.titel))))),
      h("div", { class: "card" },
        h("label", { class: "switch" },
          h("input", {
            type: "checkbox", checked: setup.zeitlimit,
            onchange: (e) => { setup.zeitlimit = e.target.checked; persist(); },
          }),
          h("span", {}, `Zeitlimit ${PRUEFUNG.minuten} Minuten`))),
      h("div", { class: "actions sticky" },
        h("p", { class: "muted pool" }, `${pool} Fragen im Pool`),
        h("button", {
          class: "btn btn-primary",
          disabled: setup.tage.size === 0 || startet,
          onclick: async (e) => {
            if (laufend && !laufend.abgegeben && !confirm("Eine Prüfung läuft noch. Neue Prüfung starten und die laufende verwerfen?")) return;
            startet = true;
            e.target.disabled = true;
            e.target.textContent = "Wird vorbereitet …";
            try {
              await startPruefung(index, [...setup.tage], setup.zeitlimit);
            } catch (err) {
              console.error(err);
              alert("Die Fragen konnten nicht geladen werden. Bitte prüfe deine Internetverbindung und versuche es erneut.");
              startet = false;
              zeichne();
            }
          },
        }, `${PRUEFUNG.fragen} Fragen starten`)));
  }

  zeichne();
}
