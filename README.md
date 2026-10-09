# M-094 Lernapp – BWL-Grundlagen & Recht

Mobile Lernapp zum Modul M-094 mit allen Online-Quizzen (Tag 1–15, 27 Sessions, 1.620 Fragen).

**App öffnen:** https://cansi798.github.io/Industrie_BwlGrundlagen/

## Was die App kann

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

## Tests

```bash
npm test                                   # Quizlogik (node --test)
python -m unittest tests/test_extract.py   # Daten: 27 Sessions, 1.620 Fragen, IDs, Erklärungen
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
