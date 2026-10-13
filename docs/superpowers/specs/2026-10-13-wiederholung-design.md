# Wiederholung Tag 1–6 – Design

Datum: 2026-10-13 · Branch: `wiederholung`

## Ziel

Die Teilnehmenden wiederholen den Stoff von Tag 1 bis Tag 6 (05.10.–12.10.2026) in der bestehenden Lernapp. Dafür gibt es 200 neue Aufgaben in drei Typen. Jede Aufgabe hat eine Lösung mit Erklärung in einfacher Sprache.

**Erfolgskriterien**

- Alle 200 Aufgaben lassen sich auf dem Handy bearbeiten, auch offline.
- Jedes Ergebnis einer Rechenaufgabe ist automatisch nachgerechnet.
- Die bestehende App (1.620 Fragen, Prüfungssimulator, Fortschritt) läuft unverändert weiter.

## Umfang

| Typ | Anzahl | Bewertung |
|---|---|---|
| Multiple Choice (MC) | 100 | automatisch (wie bisher) |
| Offene Frage | 50 | Selbsteinschätzung nach Musterlösung |
| Rechenaufgabe | 50 | automatisch mit Toleranz |

Verteilung je Tag (Tag 1 ist wenig rechenlastig, Tag 4–5 sehr):

| Tag | Thema | MC | Offen | Rechnen | Summe |
|---|---|---|---|---|---|
| 1 | Wirtschaften verstehen und Unternehmensziele | 18 | 12 | 4 | 34 |
| 2 | Bilanz – Inventur, Inventar, Bilanz, Strukturbilanz | 17 | 8 | 9 | 34 |
| 3 | Gewinn- und Verlustrechnung | 17 | 7 | 9 | 33 |
| 4 | Kennzahlen und Finanzierungsregeln | 16 | 7 | 10 | 33 |
| 5 | Rentabilitäten, EBIT, EBITDA, Leverage-Effekt | 16 | 7 | 10 | 33 |
| 6 | Liquidität und Cashflow | 16 | 9 | 8 | 33 |
| | **Summe** | **100** | **50** | **50** | **200** |

Nicht im Umfang: Aufgaben im Prüfungssimulator, Tage ab Tag 7, Änderungen an den bestehenden 1.620 Fragen.

## Inhalte

- **Quelle:** Skripte, Präsentationen und Tagesabläufe von Tag 1–6 im Ordner `M-094_BWL_Grundlagen/Teil1_BWL_05.10-16.10/`. Begriffe und Formeln folgen genau dem Kursmaterial (z. B. die dort verwendete Formel für Cashflow oder Anlagendeckungsgrad).
- **Neu formuliert:** keine wörtlichen Kopien der bestehenden 720 Fragen zu Tag 1–6. Ein Test prüft das.
- **Rechenaufgaben** nutzen eigene kleine Fälle mit wechselnden Beispielfirmen. Alle nötigen Zahlen stehen im Kasten „Angaben“. Jede Aufgabe ist für sich lösbar. Die Fallstudie Nordholz GmbH wird nicht verwendet.
- **Erklärungen** in einfacher Sprache: kurze Sätze, ein Gedanke pro Satz, Fachbegriffe kurz erklärt. Bei Rechenaufgaben gibt es dazu den Rechenweg in Schritten.
- **MC:** genau 4 Antworten, mindestens 1 richtig. Mehrfachauswahl ist erlaubt (wie bisher).

## Datenformat

Eigene Indexdatei `data/wiederholung.json` (wird nicht von `tools/extract.py` überschrieben):

```json
{
  "titel": "Wiederholung Tag 1–6",
  "untertitel": "200 Aufgaben · Multiple Choice, offene Fragen, Rechnen",
  "sessions": [
    { "id": "wdh-tag01", "tagNr": 1, "titel": "Wirtschaften verstehen und Unternehmensziele",
      "datei": "data/wdh-tag01.json", "anzahl": 34 }
  ]
}
```

Aufgabendateien `data/wdh-tag01.json` … `data/wdh-tag06.json`. IDs haben die Form `wdh-tag01-01`.

**MC** – wie bisher, ohne `typ`:

```json
{ "id": "wdh-tag01-01", "q": "…", "options": [{ "t": "…", "c": true }, …], "expl": "…" }
```

**Rechenaufgabe:**

```json
{ "id": "wdh-tag04-20", "typ": "rechnen",
  "q": "Berechne die Eigenkapitalquote.",
  "angaben": "Eigenkapital: 240.000 €; Gesamtkapital: 800.000 €",
  "einheit": "%", "loesung": 30, "toleranz": 0.1,
  "rechnung": "240000 / 800000 * 100",
  "schritte": ["Eigenkapitalquote = Eigenkapital ÷ Gesamtkapital × 100",
               "240.000 ÷ 800.000 = 0,30", "0,30 × 100 = 30 %"],
  "expl": "Die Eigenkapitalquote zeigt, welcher Anteil des Kapitals dem Unternehmen selbst gehört. …" }
```

- `loesung` ist auf höchstens 2 Nachkommastellen gerundet. In der Aufgabe steht, wie gerundet werden soll (z. B. „auf eine Nachkommastelle“), sobald das Ergebnis nicht glatt ist.
- `toleranz` ist eine absolute Abweichung. Standard, falls das Feld fehlt: 0,01.
- `rechnung` ist ein reiner Rechenausdruck (Ziffern, `+ - * / ( )`, Punkt als Dezimaltrenner). Er wird nur im Test ausgewertet, nie in der App.

**Offene Frage:**

```json
{ "id": "wdh-tag06-25", "typ": "offen",
  "q": "Warum kann ein Unternehmen mit Gewinn trotzdem zahlungsunfähig werden?",
  "kernpunkte": ["Gewinn ist nicht gleich Geld auf dem Konto", "…"],
  "expl": "…" }
```

`kernpunkte`: 2–4 Punkte, die eine gute Antwort enthalten sollte.

## App

### Startseite (`js/views/start.js`)

Unter der Prüfungs-Karte steht ein neuer Abschnitt **„Wiederholung Tag 1–6“** mit 7 Kacheln: Tag 1 bis Tag 6, jeweils in der Tagesfarbe (`tagStyle`), und eine Kachel **„Alle 200 gemischt“**. Jede Kachel zeigt wie bisher „x/n richtig“ und einen Fortschrittsbalken. Die Teile 1 und 2 folgen darunter unverändert.

### Daten (`js/lib/data.js`)

- `loadWiederholung()` lädt `data/wiederholung.json` mit Cache, genau wie `loadIndex()`.
- `loadSession(sid)` findet Sessions auch im Wiederholungsindex.
- Die virtuelle Session `wdh-alle` liefert alle 6 Dateien zusammen.

### Übungsablauf (`js/views/session.js`)

Route wie bisher: `#/session/wdh-tag01`, `#/session/wdh-alle`, „Nur falsche wiederholen“ mit `?nurFalsche=1`. Der Ablauf bleibt gleich, nur der Knopf und das Prüfen hängen vom Typ ab:

| Typ | Knopf vor dem Prüfen | aktiv, wenn | danach |
|---|---|---|---|
| MC | „Prüfen“ | eine Antwort gewählt | wie bisher |
| Rechnen | „Prüfen“ | eine gültige Zahl eingegeben | richtig/falsch, Musterergebnis, Rechenweg, Erklärung |
| Offen | „Lösung zeigen“ | immer | Kernpunkte und Erklärung. Darunter drei Knöpfe: „Gewusst“, „Teilweise“, „Nicht gewusst“. Erst die Wahl zählt als Ergebnis. |

Ergebnis für Fortschritt und Auswertung: „Gewusst“ = richtig. „Teilweise“ und „Nicht gewusst“ = falsch, die Frage landet also bei „Nur falsche wiederholen“. Beide Ansichten („Eine pro Seite“, „Alle untereinander“) unterstützen alle Typen.

### Darstellung (`js/lib/aufgabe.js`, neu)

`frageView` in `frage.js` bekommt eine Weiche: Bei `typ === "rechnen"` oder `typ === "offen"` liefert `aufgabeView` aus `aufgabe.js` die Darstellung, sonst bleibt alles wie bisher. Der Angaben-Kasten wird gemeinsam genutzt.

- Rechnen: `<input inputmode="decimal">` mit sichtbarem Label und der Einheit dahinter. Enter löst „Prüfen“ aus.
- Offen: `<textarea>` für die eigene Antwort. Sie wird nur während der Runde gehalten und nicht gespeichert.
- Barrierefreiheit wie bisher: Labels, Fokus auf die Erklärung nach dem Prüfen, `role="status"`.

### Logik (`js/lib/quiz.js`)

- `parseZahl(text)` wandelt Eingaben in Zahlen um: `"30"`, `"30,5"`, `"1.234,56"`, `"1234.56"`, `"12 %"`, `"1.200 €"`. Leer oder ungültig ergibt `null`.
  - Enthält die Eingabe ein Komma, ist das Komma der Dezimaltrenner und Punkte trennen Tausender.
  - Ohne Komma gilt `^\d{1,3}(\.\d{3})+$` als Tausendertrennung, sonst ist der Punkt der Dezimaltrenner.
- `isCorrect(q, antwort)`:
  - MC: unverändert, die Antwort ist eine Menge von Indizes.
  - Rechnen: `|parseZahl(antwort) − loesung| ≤ toleranz`.
  - Offen: `antwort === "gewusst"`.
- `prepareQuestion` mischt nur MC-Optionen und gibt andere Typen unverändert zurück.

### Offline (`sw.js`)

`js/lib/aufgabe.js` und `data/wiederholung.json` kommen in die Liste `APP`. Beim Installieren werden auch die Dateien aus `wiederholung.json` geladen. `CACHE` steigt auf `m094-v7`.

## Tests

- `tests/quiz.test.mjs` (erweitert): `parseZahl` mit allen Formaten oben, `isCorrect` für Rechnen (Grenze der Toleranz) und Offen, `prepareQuestion` lässt Nicht-MC unverändert.
- `tests/wiederholung.test.mjs` (neu, liest die JSON-Dateien):
  - genau 200 Aufgaben, Verteilung 100/50/50 und je Tag wie in der Tabelle, `anzahl` im Index stimmt
  - IDs eindeutig und fortlaufend, Pflichtfelder je Typ vorhanden
  - MC: 4 Optionen, mindestens 1 richtig, keine doppelten Optionstexte
  - Rechnen: `rechnung` enthält nur erlaubte Zeichen, das Ergebnis weicht um höchstens 0,005 von `loesung` ab, `schritte` nicht leer
  - Offen: 2–4 Kernpunkte
  - Erklärung zwischen 60 und 600 Zeichen
  - kein Fragetext identisch mit einer der 720 bestehenden Fragen zu Tag 1–6 (verglichen in Kleinschreibung, ohne Satzzeichen)
- Manuell im Browser: je Typ eine Aufgabe in beiden Ansichten, „Nur falsche wiederholen“, Offline nach Neuladen, Prüfungssimulator unverändert

## Fehlerfälle

- `wiederholung.json` lädt nicht: Die Startseite zeigt die bisherigen Inhalte ohne den Abschnitt und mit einem kurzen Hinweis. Die restliche App bleibt nutzbar.
- Ungültige Zahl im Rechenfeld: „Prüfen“ bleibt deaktiviert, darunter steht der Hinweis „Bitte eine Zahl eingeben, z. B. 12,5“.

## Erstellung der Inhalte

Je Tag entsteht eine Datei aus dem Kursmaterial dieses Tages. Danach laufen der Datentest und ein inhaltlicher Durchgang: Stimmt die Fachlogik, ist die Sprache einfach, ist jede MC-Frage eindeutig? Die README wird um den Abschnitt „Wiederholung“ ergänzt.
