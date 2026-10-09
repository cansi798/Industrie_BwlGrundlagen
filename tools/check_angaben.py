"""Findet Rechenaufgaben, deren Erklärung Zahlen nutzt, die weder in Frage,
Angaben noch Antworten stehen – Kandidaten für fehlende Angaben.

Aufruf: python tools/check_angaben.py [<data-Ordner>]
Zwischenergebnisse in der Erklärung erzeugen Fehlalarme; geprüfte Fälle
ohne Handlungsbedarf stehen in data/angaben_geprueft.json (id → Grund).
"""
import json
import re
import sys
from pathlib import Path

NUMS = re.compile(r"\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?")
TRIVIAL = {"0", "1", "2", "3", "100"}


def nums(text):
    return {n for n in NUMS.findall(text) if n not in TRIVIAL}


def check(data_dir):
    data_dir = Path(data_dir)
    index = json.loads((data_dir / "index.json").read_text(encoding="utf-8"))
    geprueft_file = data_dir / "angaben_geprueft.json"
    geprueft = json.loads(geprueft_file.read_text(encoding="utf-8")) if geprueft_file.exists() else {}
    offen = []
    for teil in index["teile"]:
        for tag in teil["tage"]:
            for s in tag["sessions"]:
                for q in json.loads((data_dir.parent / s["datei"]).read_text(encoding="utf-8")):
                    if q["id"] in geprueft or not any(re.search(r"\d", o["t"]) for o in q["options"]):
                        continue
                    gegeben = nums(q["q"]) | nums(q.get("angaben", "")) | set().union(*(nums(o["t"]) for o in q["options"]))
                    fehlt = nums(q["expl"]) - gegeben
                    if fehlt:
                        offen.append((q["id"], sorted(fehlt), q["q"]))
    return offen


if __name__ == "__main__":
    result = check(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "data")
    for qid, fehlt, frage in result:
        print(f"{qid}  fehlt? {', '.join(fehlt)}  –  {frage}")
    print(f"{len(result)} Fragen mit möglicherweise fehlenden Angaben")
