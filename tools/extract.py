"""Liest die Online-Quizze aus dem Modulordner M-094 und schreibt data/*.json.

Aufruf: python tools/extract.py <Pfad zu M-094_BWL_Grundlagen> [<Ziel, Standard: data>]
"""
import json
import os
import re
import sys
from pathlib import Path

QUIZ_FILE = "3_Quiz_online_60_Fragen.html"
DATA_RE = re.compile(r'<script id="data" type="application/json">(.*?)</script>', re.S)
TAG_RE = re.compile(r"^Tag(\d\d)_(\d{4}-\d\d-\d\d)_[A-Za-z]{2}_(.+)$")
SESSION_RE = re.compile(r"^Session([12])_(Vormittag|Nachmittag)_(.+)$")

# Saubere Titel; Ordnernamen sind gekürzt und ohne Umlaute/Satzzeichen
TAG_TITEL = {
    1: "Wirtschaften verstehen und Unternehmensziele",
    2: "Die Bilanz – Inventur, Inventar, Bilanz und Strukturbilanz",
    3: "Die Gewinn- und Verlustrechnung (GuV)",
    4: "Kennzahlen verstehen und Finanzierungsregeln",
    5: "Rentabilitäten, EBIT, EBITDA und Leverage-Effekt",
    6: "Liquidität und Cashflow – Kann das Unternehmen zahlen?",
    7: "Deckungsbeitrag und Break-even",
    8: "Kapitalstruktur und Bonität",
    9: "Kennzahlensysteme – DuPont-System und Balanced Scorecard",
    10: "Wiederholung und Vertiefung – Fallstudie Nordholz GmbH",
    11: "Kaufmann, Handelsregister, Firma und Vollmachten",
    12: "Rechtsformen der Unternehmen",
    13: "Unternehmenszusammenschlüsse, Rechtssubjekte und Rechtsobjekte",
    14: "Verträge und Insolvenzrecht",
    15: "Klausurtag – Gesamtwiederholung und Klausur",
}
SESSION_TITEL = {
    "Bilanz-Grundlagen": "Bilanz-Grundlagen",
    "Das-DuPont-System": "Das DuPont-System",
    "Die-Balanced-Scorecard": "Die Balanced Scorecard",
    "Gesamtwiederholung-M-094-und": "Gesamtwiederholung M-094",
    "Gesellschaftsrecht-Teil-1": "Gesellschaftsrecht Teil 1",
    "Gesellschaftsrecht-Teil-2": "Gesellschaftsrecht Teil 2",
    "GuV-in-Kontenform": "GuV in Kontenform",
    "GuV-in-Staffelform": "GuV in Staffelform",
    "EBIT-EBITDA-und-Leverage-Effekt": "EBIT, EBITDA und Leverage-Effekt",
    "Break-even-Analyse": "Break-even-Analyse",
    "Rechtssubjekte-Rechtsobjekte-und": "Rechtssubjekte und Rechtsobjekte",
    "Wiederholung-Teil-A": "Wiederholung Teil A",
    "Wiederholung-Teil-B": "Wiederholung Teil B",
}
UMLAUT_FIXES = {
    "Liquiditaet": "Liquidität", "Rentabilitaeten": "Rentabilitäten", "Bonitaet": "Bonität",
    "Unternehmenszusammenschluesse": "Unternehmenszusammenschlüsse", "Vertraege": "Verträge",
    "schliessen": "schließen",
}


def long_path(p):
    p = os.path.abspath(p)
    return "\\\\?\\" + p if os.name == "nt" and not p.startswith("\\\\?\\") else p


def pretty(slug):
    """Ordnerkürzel → lesbarer Titel (Rückfallebene ohne Eintrag in SESSION_TITEL)."""
    if slug in SESSION_TITEL:
        return SESSION_TITEL[slug]
    return " ".join(UMLAUT_FIXES.get(w, w) for w in slug.split("-"))


def find_quizzes(source):
    """Liefert [(tag_nr, datum, session_nr, session_slug, dateipfad)] sortiert."""
    found = []
    for dirpath, _, files in os.walk(long_path(source)):
        if "BROMIUM" in dirpath or QUIZ_FILE not in files:
            continue
        parts = Path(dirpath).parts
        tag = TAG_RE.match(parts[-2])
        sess = SESSION_RE.match(parts[-1])
        if not (tag and sess):
            continue
        found.append((int(tag.group(1)), tag.group(2), int(sess.group(1)), sess.group(3),
                      os.path.join(dirpath, QUIZ_FILE)))
    return sorted(found)


def read_questions(path):
    html = open(path, encoding="utf-8").read()
    return json.loads(DATA_RE.search(html).group(1))


def build(source, target):
    target = Path(target)
    target.mkdir(parents=True, exist_ok=True)
    override_file = target / "erklaerungen_override.json"
    overrides = json.loads(override_file.read_text(encoding="utf-8")) if override_file.exists() else {}

    teile = [{"id": "teil1", "titel": "Teil 1 – BWL", "tage": []},
             {"id": "teil2", "titel": "Teil 2 – Recht und Klausur", "tage": []}]
    tage = {}
    used_overrides = set()
    for nr, datum, snr, slug, path in find_quizzes(source):
        tid = f"tag{nr:02d}"
        if tid not in tage:
            tage[tid] = {"id": tid, "nr": nr, "datum": datum, "titel": TAG_TITEL[nr], "sessions": []}
            teile[0 if nr <= 10 else 1]["tage"].append(tage[tid])
        sid = f"{tid}-{snr}"
        questions = []
        for i, q in enumerate(read_questions(path), start=1):
            qid = f"{sid}-{i:02d}"
            expl = overrides.get(qid, q["expl"]).strip()
            if qid in overrides:
                used_overrides.add(qid)
            questions.append({"id": qid, "q": q["q"].strip(),
                              "options": [{"t": o["t"].strip(), "c": bool(o["c"])} for o in q["options"]],
                              "expl": expl})
        datei = f"data/{sid}.json"
        (target / f"{sid}.json").write_text(json.dumps(questions, ensure_ascii=False), encoding="utf-8")
        tage[tid]["sessions"].append({
            "id": sid,
            "titel": f"{'Vormittag' if snr == 1 else 'Nachmittag'}: {pretty(slug)}",
            "datei": datei, "anzahl": len(questions)})

    unknown = set(overrides) - used_overrides
    if unknown:
        raise SystemExit(f"Overrides ohne passende Frage: {sorted(unknown)}")
    (target / "index.json").write_text(json.dumps({"teile": teile}, ensure_ascii=False, indent=1),
                                       encoding="utf-8")
    total = sum(s["anzahl"] for t in tage.values() for s in t["sessions"])
    print(f"{sum(len(t['sessions']) for t in tage.values())} Sessions, {total} Fragen, "
          f"{len(used_overrides)} Erklärungen ersetzt → {target}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    build(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else Path(__file__).resolve().parent.parent / "data")
