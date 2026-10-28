# M-094 Lernapp – BWL-Grundlagen & Recht

Mobile Lernapp zum Modul M-094 mit allen Online-Quizzen (Tag 1–15, 29 Sessions, 1.740 Fragen).

**App öffnen:** https://cansi798.github.io/Industrie_BwlGrundlagen/

## Was die App kann

Die Startseite ist ein Dashboard mit vier Kacheln: **Unterricht** (alle Tage und Sessions), **Prüfungssimulation**, **Wiederholung** und **Videozusammenfassung** (Wiederholungsquiz Tag 1–12 und Wiederholung Tag 1–6).

- **Videozusammenfassung:** Kachel auf dem Dashboard, Seite `#/videos`. Videos liegen in `videos/` (MP4 mit Vorschaubild), die Liste in `data/videos.json`. Neues Video: Datei und Vorschaubild nach `videos/` legen und in `data/videos.json` eintragen. Videos werden nicht offline gespeichert, sondern gestreamt.
- **Wiederholungsquiz Tag 1–12:** Je Tag die 10 wichtigsten Fragen (120 Fragen), einzeln je Tag oder alle gemischt, danach nur die falschen Fragen üben. Die Fragen sind Kopien aus den Sessions mit gleicher ID, der Fortschritt zählt also auch im Unterricht. Daten: `data/wiederholungsquiz.json` und `data/wq-tagNN.json` (von Hand gepflegt, Test: `tests/wiederholungsquiz.test.mjs`).

- **Üben pro Session:** Fragen und Antworten in zufälliger Reihenfolge, nach jeder Frage sofort die Lösung mit einer Erklärung in einfacher Sprache. Danach kann man nur die falschen Fragen wiederholen.
- **Prüfungssimulator:** 30 Zufallsfragen aus frei wählbaren Tagen, gleichmäßig verteilt. Die Antworten erscheinen in zufälliger Reihenfolge. Während der Prüfung gibt es kein Feedback, optional läuft ein Zeitlimit von 45 Minuten. Man kann Frage für Frage blättern oder alle Fragen untereinander auf einer Seite bearbeiten. Am Ende stehen Punktzahl, Bestanden (ab 50 %), das Ergebnis nach Themen und alle Lösungen mit Erklärung.
- **Offline und als App:** Nach dem ersten Öffnen funktioniert die App ohne Internet. Über „Zum Startbildschirm hinzufügen“ lässt sie sich wie eine App installieren.
- Der Fortschritt wird nur im Browser des Geräts gespeichert. Es gibt keine Anmeldung und keinen Server.

## Fragen aktualisieren

Die Fragen stammen aus den Dateien `3_Quiz_online_60_Fragen.html` im Modulordner:

```bash
python tools/extract.py "<Pfad>/M-094_BWL_Grundlagen"
python tools/check_expl.py          # markiert zu knappe oder zu lange Erklärungen
```

Überarbeitete Erklärungen stehen in `data/erklaerungen_override.json` (Frage-ID → Text). Beim nächsten Auslesen werden sie automatisch wieder eingesetzt.

Fragen, die Zahlen aus der Fallstudie Nordholz GmbH brauchen, bekommen einen Kasten „Angaben“. Die Texte stehen in `data/angaben.json` (Frage-ID → Einträge, getrennt mit `; `). `python tools/check_angaben.py` meldet Rechenaufgaben, deren Lösung noch Zahlen braucht, die nirgends genannt sind. Bereits geprüfte Fälle ohne Handlungsbedarf stehen in `data/angaben_geprueft.json`.

## Wiederholung Tag 1–6

Eigene Karte „Wiederholung Tag 1–6“ auf der Startseite (unter dem Prüfungssimulator); sie öffnet die Übersicht `#/wiederholung` mit 200 Aufgaben zu Tag 1–6, in drei Typen: 100 Multiple Choice, 50 Rechenaufgaben und 50 offene Fragen (Antwort selbst formulieren, danach selbst einschätzen: „Gewusst“, „Teilweise“ oder „Nicht gewusst“). Es gibt eine Session je Tag und eine Session „Alle 200 gemischt“.

Die Daten stehen in `data/wiederholung.json` (Übersicht) und `data/wdh-tag0N.json` (Aufgaben je Tag). Diese Dateien werden nicht von `extract.py` erzeugt, sondern von Hand gepflegt.

```bash
node --test tests/wiederholung.test.mjs
```

## Tests

```bash
npm test                                   # Quizlogik und Wiederholung (node --test)
node --test tests/wiederholung.test.mjs    # Wiederholung Tag 1–6: 200 Aufgaben, IDs, Typen
python -m unittest tests/test_extract.py   # Daten: 29 Sessions, 1.740 Fragen, IDs, Erklärungen
```

## Aufbau

| Pfad | Inhalt |
|---|---|
| `index.html`, `css/`, `js/` | App (Vanilla JS, ES-Module, ohne Build-Schritt) |
| `js/lib/quiz.js` | Mischen, Bewerten, Prüfung ziehen (getestet) |
| `data/` | Fragen als JSON (erzeugt) |
| `sw.js`, `manifest.webmanifest` | Offline-Nutzung und Installation |
| `tools/` | Extraktion und Prüfung der Erklärungen |

Kommen Dateien zur App hinzu, müssen sie in die Liste `APP` in `sw.js` eingetragen und `CACHE` erhöht werden.
