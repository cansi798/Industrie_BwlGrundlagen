"""Markiert Erklärungen, die für einfache Sprache zu knapp oder zu verschachtelt sind.

Aufruf: python tools/check_expl.py [<data-Ordner>] [--json]
Kriterien: weniger als 8 Wörter oder ein Satz mit mehr als 20 Wörtern.
"""
import json
import re
import sys
from pathlib import Path

MIN_WORDS = 8
MAX_SENTENCE = 20
# Satzende: . ! ? gefolgt von Leerzeichen/Ende, nicht bei Dezimalzahlen oder Abkürzungen wie "z. B."
SENTENCE_END = re.compile(r"(?<!\bz)(?<!\bB)(?<!\bd)(?<!\bh)(?<!\bu)(?<!\ba)(?<!\bbzw)(?<!\bvgl)(?<!\bNr)[.!?](?=\s|$)")


def sentences(text):
    return [s for s in SENTENCE_END.split(text) if s.strip()]


def problems(expl):
    found = []
    if len(expl.split()) < MIN_WORDS:
        found.append("zu kurz")
    if any(len(s.split()) > MAX_SENTENCE for s in sentences(expl)):
        found.append("Satz zu lang")
    return found


def check(data_dir):
    data_dir = Path(data_dir)
    index = json.loads((data_dir / "index.json").read_text(encoding="utf-8"))
    flagged = []
    for teil in index["teile"]:
        for tag in teil["tage"]:
            for s in tag["sessions"]:
                for q in json.loads((data_dir.parent / s["datei"]).read_text(encoding="utf-8")):
                    p = problems(q["expl"])
                    if p:
                        flagged.append({"id": q["id"], "grund": ", ".join(p), "q": q["q"],
                                        "richtig": [o["t"] for o in q["options"] if o["c"]], "expl": q["expl"]})
    return flagged


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    result = check(args[0] if args else Path(__file__).resolve().parent.parent / "data")
    if "--json" in sys.argv:
        print(json.dumps(result, ensure_ascii=False, indent=1))
    else:
        for f in result:
            print(f"{f['id']}  [{f['grund']}]  {f['expl']}")
        print(f"{len(result)} Erklärungen markiert")
