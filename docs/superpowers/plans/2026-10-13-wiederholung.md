# Wiederholung Tag 1–6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 200 neue Wiederholungsaufgaben zu Tag 1–6 (100 MC, 50 offen, 50 Rechnen) als eigener Bereich in der Lernapp.

**Architecture:** Eine eigene Indexdatei `data/wiederholung.json` mit 6 Sessions `wdh-tag01` … `wdh-tag06` und einer virtuellen Session `wdh-alle`. Der bestehende Übungsablauf (`session.js`) bekommt zwei neue Aufgabentypen. Die Darstellung liegt in `js/lib/aufgabe.js`, die Bewertung in `quiz.js`. Ein Datentest prüft Anzahlen, Felder und rechnet jede Rechenaufgabe nach.

**Tech Stack:** Vanilla JS (ES-Module, kein Build), `node --test`, JSON-Daten, Service Worker.

**Spec:** `docs/superpowers/specs/2026-10-13-wiederholung-design.md`

## Global Constraints

- Verteilung je Tag (MC/Offen/Rechnen): Tag 1 18/12/4, Tag 2 17/8/9, Tag 3 17/7/9, Tag 4 16/7/10, Tag 5 16/7/10, Tag 6 16/9/8. Summe 100/50/50 = 200.
- IDs: `wdh-tagNN-MM`, zweistellig, je Datei fortlaufend ab `01`.
- MC: genau 4 Optionen, mindestens 1 richtig, kein Feld `typ`.
- Rechnen: `typ: "rechnen"`, Pflichtfelder `angaben`, `einheit`, `loesung` (höchstens 2 Nachkommastellen), `rechnung` (nur Ziffern, Leerzeichen, `. + - * / ( )`), `schritte` (nicht leer). `toleranz` ist optional, Standard 0,01.
- Offen: `typ: "offen"`, `kernpunkte` mit 2–4 Einträgen.
- `expl`: 60–600 Zeichen, einfache Sprache (kurze Sätze, ein Gedanke pro Satz, Fachbegriffe kurz erklärt).
- Keine Fallstudie Nordholz GmbH. Keine wörtlichen Kopien der bestehenden Fragen aus `data/tag01-1.json` … `data/tag06-2.json`.
- Offene Fragen: „Gewusst“ = richtig, „Teilweise“ und „Nicht gewusst“ = falsch.
- Prüfungssimulator und `data/index.json` bleiben unverändert. `tools/extract.py` wird nicht angefasst.
- `sw.js`: `CACHE = "m094-v7"`.
- Alle Texte in der App auf Deutsch mit korrekten Umlauten.

## Review Focus

1. **Negative Ergebnisse** (Cashflow, Jahresfehlbetrag): Eingaben wie `-12.000`, `−12.000` (Unicode-Minus) oder `-1,5` müssen als negative Zahl erkannt werden. → Tests in Task 1.
2. **Einheiten und Leerzeichen in der Eingabe**: `12 %`, `1.200 €`, ` 30,5 ` müssen gültig sein. `abc`, `12,3,4` und leere Eingaben müssen `null` ergeben. → Tests in Task 1.
3. **Tippen im Rechenfeld**: Die Ansicht darf bei jedem Tastendruck nicht neu zeichnen, sonst springen Fokus und Cursor. → Prüfung im Browser in Task 4.
4. **„Teilweise“ bei offenen Fragen**: Die Frage muss danach bei „Nur falsche wiederholen“ erscheinen, und die Kachel darf sie nicht als richtig zählen. → Prüfung im Browser in Task 4.
5. **Offline-Installation**: Fehlt eine in `wiederholung.json` genannte Datei, schlägt `cache.addAll` fehl und die ganze App ist nicht offline verfügbar. → Datentest „jede datei existiert“ in Task 2.

---

### Task 1: Bewertungslogik für Rechnen und Offen

**Files:**
- Modify: `js/lib/quiz.js`
- Test: `tests/quiz.test.mjs`

**Interfaces:**
- Produces: `parseZahl(text: string) → number | null`; `isCorrect(q, antwort)`, wobei `antwort` bei MC `Set<number> | number[]` ist, bei Rechnen ein `string` (Rohtext der Eingabe) und bei Offen `"gewusst" | "teilweise" | "nicht"`; `prepareQuestion(q)` gibt Nicht-MC-Fragen als flache Kopie ohne Mischen zurück (kein `multi`); `TOLERANZ_STANDARD = 0.01`.

- [ ] **Step 1: Write the failing tests** in `tests/quiz.test.mjs` (Import um `parseZahl` erweitern)

```js
test("parseZahl versteht deutsche und englische Schreibweisen", () => {
  for (const [ein, aus] of [
    ["30", 30], ["30,5", 30.5], [" 30,5 ", 30.5], ["1.234,56", 1234.56], ["1234.56", 1234.56],
    ["1.234", 1234], ["1.200 €", 1200], ["12 %", 12], ["1.5", 1.5], ["0,25", 0.25],
    ["-12.000", -12000], ["−12.000", -12000], ["-1,5", -1.5], ["1 200", 1200],
  ]) assert.equal(parseZahl(ein), aus, ein);
});

test("parseZahl liefert null bei ungültiger Eingabe", () => {
  for (const ein of ["", "   ", "abc", "12,3,4", "1.2.3,4,5", "€", "-", undefined, null])
    assert.equal(parseZahl(ein), null, String(ein));
});

const rechnen = { id: "r1", typ: "rechnen", q: "?", loesung: 30, toleranz: 0.1, expl: "x" };

test("isCorrect Rechnen: innerhalb der Toleranz richtig, außerhalb falsch", () => {
  assert.equal(isCorrect(rechnen, "30"), true);
  assert.equal(isCorrect(rechnen, "30,1"), true);
  assert.equal(isCorrect(rechnen, "29,9 %"), true);
  assert.equal(isCorrect(rechnen, "30,2"), false);
  assert.equal(isCorrect(rechnen, ""), false);
  assert.equal(isCorrect(rechnen, undefined), false);
});

test("isCorrect Rechnen: ohne toleranz gilt 0,01", () => {
  const q = { ...rechnen, toleranz: undefined, loesung: -1250.5 };
  assert.equal(isCorrect(q, "-1.250,51"), true);
  assert.equal(isCorrect(q, "-1.250,52"), false);
});

test("isCorrect Offen: nur 'gewusst' zählt als richtig", () => {
  const q = { id: "o1", typ: "offen", q: "?", kernpunkte: ["a", "b"], expl: "x" };
  assert.equal(isCorrect(q, "gewusst"), true);
  assert.equal(isCorrect(q, "teilweise"), false);
  assert.equal(isCorrect(q, "nicht"), false);
  assert.equal(isCorrect(q, undefined), false);
});

test("prepareQuestion lässt Rechnen und Offen unverändert", () => {
  const out = prepareQuestion(rechnen, seeded());
  assert.deepEqual(out, rechnen);
  assert.notEqual(out, rechnen);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, weil `parseZahl` nicht exportiert ist

- [ ] **Step 3: Implement in `js/lib/quiz.js`**

`parseZahl`: Leerzeichen (auch geschützte), `€` und `%` entfernen, Unicode-Minus `−` durch `-` ersetzen, dann mit `^-?[\d.,]+$` prüfen, sonst `null`. Weiter nach diesen Regeln:
- Mit Komma: Gibt es mehr als ein Komma → `null`. Sonst Punkte entfernen und das Komma durch einen Punkt ersetzen.
- Ohne Komma: Passt `^-?\d{1,3}(\.\d{3})+$` → Punkte entfernen.
- Am Ende `Number(...)` und bei `NaN` `null` zurückgeben.

`isCorrect` verzweigt nach `q.typ`. MC bleibt unverändert. `prepareQuestion` gibt bei `q.typ` den Wert `{ ...q }` zurück.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: alle Tests PASS, auch die bestehenden

- [ ] **Step 5: Commit**

```bash
git add js/lib/quiz.js tests/quiz.test.mjs
git commit -m "feat: Bewertung für Rechenaufgaben und offene Fragen"
```

---

### Task 2: Wiederholungsindex und Datentest

**Files:**
- Create: `data/wiederholung.json`
- Create: `tests/wiederholung.test.mjs`

**Interfaces:**
- Produces: Indexformat wie in der Spec. Die Session-Titel haben die Form `"Tag 1: Wirtschaften verstehen und Unternehmensziele"` (die Startseiten-Kachel trennt an `": "`), dazu `tagNr` und `anzahl` laut Verteilung (34, 34, 33, 33, 33, 33). Testnamen beginnen mit der Session-ID (`"wdh-tag03: …"`), damit Task 3–8 mit `--test-name-pattern` gezielt laufen können.

- [ ] **Step 1: `data/wiederholung.json` anlegen** mit `titel: "Wiederholung Tag 1–6"`, `untertitel: "200 Aufgaben · Multiple Choice, offene Fragen, Rechnen"` und 6 Sessions. Die Thementitel stammen aus `data/index.json` (Tag 1–6).

- [ ] **Step 2: `tests/wiederholung.test.mjs` schreiben.** Die Dateien werden mit `fs.readFileSync` relativ zu `new URL("../", import.meta.url)` gelesen. Die Verteilung wird als Konstante festgehalten:

```js
const SOLL = { 1: [18, 12, 4], 2: [17, 8, 9], 3: [17, 7, 9], 4: [16, 7, 10], 5: [16, 7, 10], 6: [16, 9, 8] };
```

Je Session ein Block von Tests mit dem Präfix `${s.id}:`:
- `datei existiert` und `anzahl` = Länge der Datei
- `Verteilung` gleich `SOLL[tagNr]`
- `IDs` gleich `${s.id}-01` … fortlaufend
- `MC`: 4 Optionen, mindestens 1 mit `c: true`, Optionstexte eindeutig, kein `typ`
- `Rechnen`: alle Pflichtfelder vorhanden, `rechnung` passt zu `/^[\d\s.+\-*/()]+$/`, `Math.abs(Function(\`return (${rechnung})\`)() - loesung) <= 0.005`, `loesung` hat höchstens 2 Nachkommastellen, `schritte.length > 0`, `typeof einheit === "string"`
- `Offen`: `kernpunkte.length` zwischen 2 und 4
- `expl` 60–600 Zeichen bei allen Typen, `q` nicht leer
- `keine Kopie`: `norm(q)` kommt in keiner Frage aus `data/tag0{N}-1.json` / `-2.json` vor. Dabei ist `norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()`.

Dazu ein Test `Gesamt: 200 Aufgaben, 100 MC, 50 offen, 50 Rechnen`, der über alle Sessions zählt.

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/wiederholung.test.mjs`
Expected: FAIL mit „datei existiert“ für alle 6 Sessions (die Aufgabendateien fehlen noch)

- [ ] **Step 4: Commit**

```bash
git add data/wiederholung.json tests/wiederholung.test.mjs
git commit -m "test: Datentest und Index für Wiederholung Tag 1–6"
```

---

### Task 3–8: Aufgaben Tag 1 bis Tag 6 (eine Task je Tag, unabhängig voneinander)

Diese sechs Tasks haben denselben Aufbau. Sie hängen nur von Task 2 ab und können parallel laufen.

| Task | Datei | Material (unter `../M-094_BWL_Grundlagen/Teil1_BWL_05.10-16.10/`) | MC/Offen/Rechnen |
|---|---|---|---|
| 3 | `data/wdh-tag01.json` | `Tag01_…` | 18/12/4 |
| 4 | `data/wdh-tag02.json` | `Tag02_…` | 17/8/9 |
| 5 | `data/wdh-tag03.json` | `Tag03_…` | 17/7/9 |
| 6 | `data/wdh-tag04.json` | `Tag04_…` | 16/7/10 |
| 7 | `data/wdh-tag05.json` | `Tag05_…` | 16/7/10 |
| 8 | `data/wdh-tag06.json` | `Tag06_…` | 16/9/8 |

**Interfaces:**
- Consumes: Datenformat und Test aus Task 2

- [ ] **Step 1: Material lesen.** Für beide Sessions des Tages `Session*/2_Skript_fuer_Teilnehmer.pdf` lesen und ergänzend `1_Praesentation_Folien.pdf`. Die Begriffe, Formeln und Gliederungen des Tages notieren, zum Beispiel welche Cashflow-Definition oder welche Deckungsgrade der Kurs verwendet. Zum Abgleich `data/tag0N-1.json` und `-2.json` überfliegen, um den Stil zu sehen und Dopplungen zu vermeiden.

- [ ] **Step 2: Aufgaben schreiben.**
  - Die Themen beider Sessions gleichmäßig abdecken.
  - Typen in der Datei mischen, nicht blockweise.
  - **MC:** Die Ablenker sind plausibel, typische Denkfehler sind willkommen. Keine Antworten wie „alle oben genannten“.
  - **Offen:** Erklären, Begründen oder Vergleichen, zum Beispiel „Warum …?“ oder „Worin unterscheiden sich …?“. Die Kernpunkte sind kurze Stichpunkte.
  - **Rechnen:** Eigene kleine Fälle mit wechselnden Firmennamen (keine Nordholz GmbH) und runden, gut rechenbaren Zahlen. In `angaben` stehen alle nötigen Werte, getrennt mit `; `. Ist das Ergebnis nicht glatt, sagt der Fragetext, wie gerundet wird. Die `einheit` steht nach dem Feld, z. B. `"€"`, `"%"`, `"Tage"` oder `""`. `schritte` zeigt Formel → Einsetzen → Ergebnis, mit deutschen Zahlenformaten.
  - **expl:** Sagt, warum die Lösung stimmt, in einfacher Sprache.

- [ ] **Step 3: Datentest für den Tag laufen lassen**

Run: `node --test --test-name-pattern="wdh-tag0N" tests/wiederholung.test.mjs`
Expected: alle Tests dieses Tages PASS

- [ ] **Step 4: Inhaltlicher Selbstcheck.** Jede MC-Frage hat genau eine vertretbare Lösungsmenge. Die Rechenwege in `schritte` passen zu `rechnung`. Kein Fachbegriff widerspricht dem Skript.

- [ ] **Step 5: Commit**

```bash
git add data/wdh-tag0N.json
git commit -m "feat: Wiederholungsaufgaben Tag N"
```

Nach Task 8 muss `node --test tests/wiederholung.test.mjs` komplett PASS sein, einschließlich „Gesamt“.

---

### Task 4: Darstellung der neuen Aufgabentypen

(Nummerierung nach den Inhalts-Tasks: **Task 9**)

### Task 9: Darstellung der neuen Aufgabentypen

**Files:**
- Create: `js/lib/aufgabe.js`
- Modify: `js/lib/frage.js` (Weiche am Anfang von `frageView`, Angaben-Kasten als exportierte Funktion `angabenBox(q)`)
- Modify: `css/app.css` (Ende der Datei)

**Interfaces:**
- Consumes: `parseZahl`, `isCorrect` aus Task 1
- Produces: `frageView(q, opts)` mit diesen Optionen:
  - MC: unverändert, `{ selected: Set, onChange(set), reveal }`
  - Rechnen: `{ selected: string, onChange(text), reveal }`
  - Offen: `{ selected: "gewusst"|"teilweise"|"nicht"|undefined, text: string, onText(text), aufgedeckt: boolean, onBewerten(wert), reveal }`

  Bei Rechnen und Offen rufen `onChange` bzw. `onText` die Session bei jeder Eingabe auf. **Die Session zeichnet dabei nicht neu.** Damit ein „Prüfen“-Knopf außerhalb reagieren kann, löst `aufgabe.js` nach jeder Eingabe auf dem Wurzelelement das Ereignis `new CustomEvent("eingabe", { bubbles: true, detail: { gueltig } })` aus. Dabei gilt `gueltig = parseZahl(text) !== null`.

- [ ] **Step 1: `aufgabeView(q, opts)` in `js/lib/aufgabe.js` implementieren.** `frageView` ruft diese Funktion auf, wenn `q.typ` gesetzt ist.

  **Rechnen:**
  - Angaben-Kasten, Fragetext, `<label for>` „Dein Ergebnis“.
  - `<input inputmode="decimal" autocomplete="off" data-focus="eingabe:${q.id}">` mit der Einheit dahinter in `.einheit`.
  - Darunter `.hint`: „Bitte eine Zahl eingeben, z. B. 12,5“. Der Hinweis ist nur sichtbar, wenn das Feld nicht leer und ungültig ist (`hidden` wird beim `input`-Ereignis lokal umgeschaltet).
  - Enter im Feld löst ein `CustomEvent("absenden", { bubbles: true })` aus.
  - Bei `reveal` ist das Feld `readonly`. Darunter steht `.expl` wie bei MC mit „Richtig!“, „Leider falsch.“ oder „Nicht beantwortet.“. Darin steht „Lösung: 30 %“, wobei die Zahl mit `toLocaleString("de-DE")` formatiert ist. Dann folgt `<ol class="schritte">` mit den Schritten und dann `expl`.

  **Offen:**
  - Fragetext, `<textarea>` mit Label „Deine Antwort (wird nicht gespeichert)“, `data-focus="text:${q.id}"`.
  - Bei `aufgedeckt && !reveal`: `.loesung`-Box mit „Das gehört in eine gute Antwort:“, `<ul>` der Kernpunkte und `expl`. Darunter `.segmented` mit drei Knöpfen „Gewusst“, „Teilweise“, „Nicht gewusst“ (`data-focus="bewerten:${q.id}:${wert}"`), die `onBewerten(wert)` aufrufen.
  - Bei `reveal`: dieselbe Box. Dazu kommt `.expl-ok` oder `.expl-bad` mit „Deine Einschätzung: Gewusst“ bzw. „Teilweise“ oder „Nicht gewusst“.

- [ ] **Step 2: CSS ergänzen** für `.einheit`, `.zahl-eingabe` (Feld und Einheit in einer Zeile, Feldbreite 100 % minus Einheit, Schriftgröße mindestens 16px, damit iOS nicht zoomt), `textarea` (volle Breite, mindestens 4 Zeilen), `.loesung` (wie `.angaben`, aber neutral), `ol.schritte` (tabellarische Ziffern). Die Farben kommen aus vorhandenen Variablen.

- [ ] **Step 3: Bestehende Tests laufen lassen**

Run: `npm test`
Expected: PASS (keine Logik geändert)

- [ ] **Step 4: Commit**

```bash
git add js/lib/aufgabe.js js/lib/frage.js css/app.css
git commit -m "feat: Darstellung für Rechenaufgaben und offene Fragen"
```

---

### Task 10: Laden und Übungsablauf

**Files:**
- Modify: `js/lib/data.js`
- Modify: `js/views/session.js`

**Interfaces:**
- Consumes: `frageView`-Optionen aus Task 9, Ereignisse `eingabe` und `absenden`, `isCorrect` aus Task 1
- Produces:
  - `loadWiederholung() → Promise<{titel, untertitel, sessions}>`, mit Cache wie `loadIndex`
  - `WDH_ALLE = "wdh-alle"`
  - `loadSession(sid)` kennt auch die Wiederholungs-Sessions und `wdh-alle`. `wdh-alle` liefert alle 6 Dateien aneinandergehängt.

- [ ] **Step 1: `data.js` erweitern.** `loadSession` sucht zuerst in `allSessions(loadIndex)`. Beginnt `sid` mit `wdh-`, sucht es stattdessen in `loadWiederholung().sessions`. Für `WDH_ALLE` wird `Promise.all` über alle Sessions genutzt und das Ergebnis mit `.flat()` zusammengeführt. Wie bisher gilt: Schlägt das Laden fehl, wird der Cache-Eintrag gelöscht.

- [ ] **Step 2: `quelle()` in `session.js` erweitern.**
  - Für `wdh-tagNN`: `titel = "Wiederholung · " + s.titel`, `tagNr = s.tagNr`, `back = "#/"`.
  - Für `wdh-alle`: `titel = "Wiederholung · Alle 200 gemischt"`, ohne `tagNr`.
  - `nurFalsche` funktioniert wie bisher über `getProgress()`.

- [ ] **Step 3: Antwortzustand verallgemeinern.**
  - `auswahl` speichert je Frage den Wert für `frageView` (Set, String oder Bewertung).
  - Neu sind die Maps `texte` (offene Antworttexte) und das Set `aufgedeckt`.
  - Eine Hilfsfunktion `bereit(q)` entscheidet, ob „Prüfen“ aktiv ist:
    - MC: `gewaehlt(q).size > 0`
    - Rechnen: `parseZahl(auswahl.get(q.id) ?? "") !== null`
    - Offen: immer `true`
  - Der Aktionsknopf hängt vom Typ ab:
    - MC und Rechnen: „Prüfen“, ruft `pruefe(q)` auf.
    - Offen ohne `aufgedeckt`: „Lösung zeigen“. Er fügt die Frage zu `aufgedeckt` hinzu und zeichnet mit `keepFocus` neu. Danach liegt der Fokus auf dem ersten Bewertungsknopf.
    - Offen mit `aufgedeckt`, aber ohne Bewertung: kein Aktionsknopf. Die Wahl in `onBewerten` setzt `auswahl`, ruft `pruefe(q)` auf und zeichnet neu.
  - In beiden Ansichten hört der Container auf `eingabe`. Er setzt dann nur `knopf.disabled = !e.detail.gueltig` und zeichnet nicht neu. Auf `absenden` reagiert er wie ein Klick auf „Prüfen“, wenn `bereit(q)` gilt.
  - Die Auswertung bleibt unverändert, weil `ergebnis` weiter `true`/`false` speichert.

- [ ] **Step 4: Im Browser prüfen.**
  - Run: `npx --yes http-server -p 8080 -c-1` (oder `python -m http.server 8080`). Danach `http://localhost:8080/#/session/wdh-tag04` öffnen.
  - Erwartet in der Ansicht „Eine pro Seite“ und in der Ansicht „Alle untereinander“:
    - (a) MC funktioniert wie bisher.
    - (b) Bei Rechnen bleiben Fokus und Cursor beim Tippen im Feld. „Prüfen“ wird erst bei gültiger Zahl aktiv. Enter prüft. Danach erscheinen Lösung, Schritte und Erklärung.
    - (c) Bei Offen folgen „Lösung zeigen“, dann die Kernpunkte und drei Knöpfe. Nach „Teilweise“ wird die Antwort als falsch markiert.
    - (d) Die Auswertung bietet „Nur falsche wiederholen“, und dort erscheint die Frage mit „Teilweise“ wieder.
    - (e) `#/session/wdh-alle` lädt 200 Aufgaben.
    - (f) `#/pruefung` zeigt nur Tag 1–15 wie bisher.
    - (g) In der Konsole stehen keine Fehler.

- [ ] **Step 5: Tests und Commit**

Run: `npm test`
Expected: PASS

```bash
git add js/lib/data.js js/views/session.js
git commit -m "feat: Wiederholungs-Sessions im Übungsablauf"
```

---

### Task 11: Startseite, Offline, README

**Files:**
- Modify: `js/views/start.js`
- Modify: `sw.js`
- Modify: `README.md`

**Interfaces:**
- Consumes: `loadWiederholung`, `WDH_ALLE` aus Task 10

- [ ] **Step 1: Startseite.**
  - `sessionKachel(s, progress, ids?)` bekommt einen optionalen Parameter mit der ID-Liste. Fehlt er, werden die IDs wie bisher aus `s.id` und `s.anzahl` gebildet.
  - Zwischen der Prüfungs-Karte und den Teilen steht `<section class="teil wiederholung">`:
    - `h2` mit `titel`, ein `p.muted` mit `untertitel`.
    - `.kacheln` mit den 6 Tageskacheln, jede mit `style: tagStyle(s.tagNr)`.
    - Eine Kachel für `WDH_ALLE` mit dem Titel `"Alle Tage: Alle 200 gemischt"` und den IDs aller Sessions.
  - Schlägt `loadWiederholung()` fehl, steht an dieser Stelle `p.muted` „Die Wiederholung konnte nicht geladen werden.“. Der Rest der Seite wird trotzdem gezeichnet (`try/catch` nur um diesen Teil).
  - Falls die Tagesfarbe an der Kachel nicht greift, wird die CSS-Regel für `.day .kachel` in `css/app.css` um `.wiederholung .kachel` ergänzt.

- [ ] **Step 2: `sw.js`.**
  - `"js/lib/aufgabe.js"` und `"data/wiederholung.json"` kommen in `APP`.
  - Im `install`-Handler werden zusätzlich die `datei`-Einträge aus `data/wiederholung.json` geladen.
  - `CACHE = "m094-v7"`.

- [ ] **Step 3: README.** Einen Abschnitt „Wiederholung Tag 1–6“ ergänzen:
  - Die 200 Aufgaben und die drei Typen.
  - Die Dateien `data/wiederholung.json` und `data/wdh-tag0N.json`. Sie werden nicht von `extract.py` erzeugt.
  - Der Testbefehl `node --test tests/wiederholung.test.mjs`.
  - Die Zeile zu den Tests unter „Tests“ ergänzen.

- [ ] **Step 4: Im Browser prüfen.**
  - Die Startseite zeigt den Abschnitt mit 7 Kacheln in den Tagesfarben. Nach dem Üben steigt der Zähler.
  - In DevTools unter Application → Service Workers: Die Version `m094-v7` ist aktiv.
  - Offline-Modus einschalten und neu laden: `#/session/wdh-tag06` funktioniert.

- [ ] **Step 5: Gesamttests und Commit**

Run: `npm test && node --test tests/wiederholung.test.mjs`
Expected: alles PASS

```bash
git add js/views/start.js sw.js README.md css/app.css
git commit -m "feat: Wiederholung Tag 1–6 auf der Startseite, offline verfügbar"
```
