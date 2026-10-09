# Lernapp M-094 BWL-Grundlagen – Design

Stand: 2026-10-09 · Repo: `cansi798/Industrie_BwlGrundlagen` · Hosting: GitHub Pages

## 1. Ziel

Die 27 Online-Quizze des Moduls M-094 (Tag 1–15, je 60 Fragen, zusammen 1.620 Fragen) werden zu **einer** mobilen Lernapp zusammengeführt. Die Lernenden können:

- jede Session einzeln üben (mit Sofort-Feedback),
- einen **Prüfungssimulator** nutzen: 30 Zufallsfragen aus frei wählbaren Tagen, mit zufälliger Antwortreihenfolge und am Ende der Lösung samt einfacher Erklärung.

**Erfolgskriterien**

- Die App läuft unter `https://cansi798.github.io/Industrie_BwlGrundlagen/` auf dem Smartphone (ab 360 px Breite) ohne horizontales Scrollen.
- Alle 1.620 Fragen sind enthalten, jede mit Erklärung.
- Der Prüfungssimulator liefert bei jedem Start eine neue Auswahl und eine neue Antwortreihenfolge.
- Nach dem ersten Aufruf funktioniert die App offline und lässt sich zum Startbildschirm hinzufügen (PWA).

**Nicht enthalten (YAGNI):** Anmeldung, Server, Ranglisten, Dozenten-Statistik, Bearbeiten von Fragen in der App.

## 2. Quelle der Daten

- Quelldateien: `M-094_BWL_Grundlagen/Teil*/Tag*/Session*/3_Quiz_online_60_Fragen.html`
- Jede Datei enthält `<script id="data" type="application/json">` mit einer Liste von Objekten der Form
  `{"q": str, "options": [{"t": str, "c": bool} ×4], "expl": str}`.
- Bei etwa einem Drittel der Fragen sind mehrere Optionen richtig.
- Es gibt keine Quizze für Tag 11 Vormittag und Tag 13 Nachmittag. Die App zeigt nur Sessions mit Quiz an.
- Die Dateipfade sind länger als 260 Zeichen. Das Extraktionsskript nutzt deshalb unter Windows das Präfix `\\?\`.
- Dozentenunterlagen (`*_nur_Dozent.docx`) und alle anderen Materialien kommen **nicht** ins öffentliche Repo.

## 3. Datenaufbau in der App

`tools/extract.py <Pfad zu M-094_BWL_Grundlagen>` erzeugt:

- `data/index.json`: Gliederung
  ```json
  {"teile":[{"id":"teil1","titel":"Teil 1 – BWL","tage":[
    {"id":"tag02","nr":2,"datum":"2026-10-06","titel":"Die Bilanz – Inventur, Inventar, Bilanz und Strukturbilanz",
     "sessions":[{"id":"tag02-1","titel":"Vormittag: Bilanz-Grundlagen","datei":"data/tag02-1.json","anzahl":60}]}]}]}
  ```
  Die Titel werden aus den Ordnernamen abgeleitet (Bindestriche werden zu Leerzeichen, `ae/oe/ue` zu Umlauten). Ein Korrektur-Wörterbuch im Skript behebt Sonderfälle wie gekürzte Ordnernamen.
- `data/<session-id>.json`: Liste von Fragen
  `{"id":"tag02-1-07","q":…,"options":[{"t":…,"c":…}],"expl":…}`
  Die ID ist stabil: Session-ID plus laufende Nummer in der Quelldatei. Darauf baut der gespeicherte Fortschritt auf.
- `data/erklaerungen_override.json`: `{"<frage-id>": "neue Erklärung"}`. Das Skript wendet diese Datei nach dem Auslesen an. Dadurch bleibt der Export wiederholbar, und die überarbeiteten Erklärungen gehen beim erneuten Auslesen nicht verloren.

### Prüfung der Erklärungen („übernehmen + prüfen“)

`tools/check_expl.py` markiert Erklärungen,

- die weniger als 8 Wörter haben (heute 85, meist reine Rechenwege wie „120 € − 70 € = 50 €“), oder
- in denen ein Satz länger als 20 Wörter ist (heute 6).

Für jede markierte Erklärung entsteht ein Eintrag in `erklaerungen_override.json` in einfacher Sprache. Bei Rechenfragen sieht das so aus: ein Satz, was berechnet wird, dann die Rechnung, dann ein Satz, was das Ergebnis bedeutet. Beispiel:
„Der Deckungsbeitrag ist der Preis minus die variablen Kosten. 120 € − 70 € = 50 €. Jedes verkaufte Stück trägt also 50 € zur Deckung der Fixkosten bei.“
Alle anderen Erklärungen werden 1:1 übernommen.

## 4. Bildschirme und Ablauf

Die App ist eine Single-Page-App mit Hash-Routing (`#/`, `#/session/tag02-1`, `#/pruefung`, `#/pruefung/laeuft`, `#/pruefung/ergebnis`). Sie ist für das Handy gebaut (Mobile-first) und hat Antwortflächen von mindestens 48 px Höhe. Hell- und Dunkelmodus folgen der Einstellung des Geräts.

1. **Start**: Kachel „Prüfungssimulator“, darunter Teil 1 und Teil 2, Tage mit ihren Sessions und Fortschritt („42/60 richtig“ plus Balken).
2. **Übungsmodus Session**: 60 Fragen in zufälliger Reihenfolge, Antworten ebenfalls gemischt, eine Frage pro Bildschirm. Bei mehreren richtigen Antworten erscheint der Hinweis „Mehrere Antworten möglich“. Nach „Prüfen“ wird grün/rot markiert, verpasste richtige Antworten erscheinen gestrichelt grün, dazu kommt die Erklärung. Am Ende gibt es eine Auswertung und den Knopf „Nur falsche wiederholen“.
3. **Prüfung, Einstellungen**: Checkboxen pro Tag (alle angehakt), Schnellwahl „Teil 1 / Teil 2 / Alle“, Zeitlimit-Schalter (45 Min., standardmäßig an) und der Knopf „30 Fragen starten“. Ohne Auswahl ist der Startknopf deaktiviert.
4. **Prüfung läuft**: „Frage 7 von 30“, Timer, kein Feedback, Vor/Zurück, „Markieren“ und eine Fragenübersicht (beantwortet, offen, markiert). „Abgeben“ fragt nach, wenn noch Fragen offen sind. Bei Zeitablauf wird automatisch abgegeben.
5. **Ergebnis**: Punktzahl, Prozent, **Bestanden ab 50 %**, Auswertung pro Tag. Darauf folgt die Liste aller 30 Fragen mit eigener Antwort, richtiger Lösung und Erklärung, mit dem Filter „nur falsche“. Knöpfe: „Neue Prüfung“ und „Falsche üben“.

## 5. Logik

- **Mischen**: Fisher-Yates mit `crypto.getRandomValues`.
- **Bewertung**: Eine Frage ist richtig, wenn die angekreuzte Menge genau der Menge der richtigen Optionen entspricht. Teilpunkte gibt es nicht. Jede Frage zählt 1 Punkt.
- **Auswahl der 30 Fragen**: Aus den gewählten Tagen werden die Fragen möglichst gleichmäßig gezogen: `30 / Anzahl Tage` pro Tag, der Rest wird zufällig verteilt, Fragen innerhalb eines Tages zufällig. Bei weniger als 30 verfügbaren Fragen (theoretisch) werden alle genommen.
- **Laufende Prüfung** wird in `localStorage` gesichert (Fragen-IDs, Antwortreihenfolge, Antworten, Endzeit). Nach einem Neuladen geht es weiter, der Timer läuft mit der echten Uhrzeit weiter.
- **Fortschritt**: `localStorage["m094.fortschritt"] = {"<frage-id>": true|false}` für die letzte Antwort im Übungsmodus. Der Fortschritt einer Session ist die Anzahl der zuletzt richtig beantworteten Fragen. Alle Zugriffe auf `localStorage` stehen in `try/catch`, die App funktioniert auch ohne Speicher.
- **Fehler beim Laden** (z. B. offline ohne Cache): verständliche Meldung mit dem Knopf „Erneut versuchen“.

## 6. Dateistruktur

```
index.html
manifest.webmanifest
sw.js                    Service Worker: Cache-first für App und data/
css/app.css
js/app.js                Router und Start
js/views/*.js            start, session, pruefung-setup, pruefung, ergebnis
js/lib/quiz.js           mischen, bewerten, ziehen (reine Funktionen, testbar)
js/lib/store.js          localStorage-Kapselung
icons/                   App-Icons 192/512 px
data/                    erzeugt von tools/extract.py
tools/extract.py, tools/check_expl.py
tests/quiz.test.mjs      Tests für js/lib/quiz.js (node --test, ohne Abhängigkeiten)
tests/test_extract.py    Tests für das Extraktionsskript (unittest)
.nojekyll
```

Es gibt keine Abhängigkeiten zur Laufzeit und keinen Build-Schritt. JavaScript wird als ES-Module geladen.

## 7. Offline und Deployment

- Der Service Worker speichert beim Installieren die App-Dateien und alle `data/*.json` (zusammen etwa 1,5 MB). Die Cache-Version wird über eine Konstante in `sw.js` erhöht.
- Alle Pfade sind relativ, weil die Seite unter `/Industrie_BwlGrundlagen/` liegt.
- GitHub Pages: Branch `main`, Ordner `/` (Root). Pages wird einmalig in den Repo-Einstellungen aktiviert, entweder von dir oder per `gh api`, nach Rückfrage.
- Gepusht wird erst nach deiner Freigabe.

## 8. Tests

- `tests/test_extract.py`: Es entstehen 27 Session-Dateien und 1.620 Fragen. Jede Frage hat 4 Optionen, mindestens eine richtige Option und eine nicht leere Erklärung. Die IDs sind eindeutig. Alle Overrides verweisen auf existierende IDs.
- `tests/quiz.test.mjs` (`node --test`): Das Mischen erhält alle Elemente. Die Bewertung ist für Einfach- und Mehrfachauswahl korrekt. Das Ziehen liefert 30 eindeutige Fragen nur aus den gewählten Tagen und verteilt sie gleichmäßig.
- Manuelle Prüfung im Browser bei 375 px Breite: Übungsdurchlauf, Prüfung mit Abgabe, Neuladen während der Prüfung, Offline-Start.
