import json
import re
import unittest
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"

# Wörter, in denen ae/oe/ue korrekt geschrieben sind
UMLAUT_WHITELIST = {"quelle", "neue", "neuer", "steuer", "steuern", "dauer", "aktuell", "aktuelle",
                    "individuelle", "manuelle", "eventuell", "bauer", "feuer", "michael", "israel",
                    "abenteuer", "treue", "zuerst", "poesie", "ueber"}


def load_index():
    return json.loads((DATA / "index.json").read_text(encoding="utf-8"))


def sessions(index):
    return [s for t in index["teile"] for d in t["tage"] for s in d["sessions"]]


def load_questions(session):
    return json.loads((DATA.parent / session["datei"]).read_text(encoding="utf-8"))


class TestExtract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = load_index()
        cls.sessions = sessions(cls.index)
        cls.questions = {s["id"]: load_questions(s) for s in cls.sessions}

    def test_counts(self):
        self.assertEqual(len(self.sessions), 27)
        self.assertEqual(sum(s["anzahl"] for s in self.sessions), 1620)
        for s in self.sessions:
            self.assertEqual(len(self.questions[s["id"]]), s["anzahl"])

    def test_question_shape(self):
        for qs in self.questions.values():
            for q in qs:
                self.assertEqual(len(q["options"]), 4, q["id"])
                self.assertGreaterEqual(sum(o["c"] for o in q["options"]), 1, q["id"])
                self.assertTrue(q["expl"].strip(), q["id"])
                self.assertTrue(q["q"].strip(), q["id"])

    def test_ids_unique(self):
        ids = [q["id"] for qs in self.questions.values() for q in qs]
        self.assertEqual(len(ids), len(set(ids)))
        for i in ids:
            self.assertRegex(i, r"^tag\d\d-[12]-\d\d$")

    def test_overrides_valid(self):
        overrides = json.loads((DATA / "erklaerungen_override.json").read_text(encoding="utf-8"))
        by_id = {q["id"]: q for qs in self.questions.values() for q in qs}
        for qid, text in overrides.items():
            self.assertIn(qid, by_id)
            self.assertEqual(by_id[qid]["expl"], text)

    def test_angaben_valid(self):
        angaben = json.loads((DATA / "angaben.json").read_text(encoding="utf-8"))
        by_id = {q["id"]: q for qs in self.questions.values() for q in qs}
        for qid, text in angaben.items():
            self.assertIn(qid, by_id)
            q = by_id[qid]
            self.assertEqual(q.get("angaben"), text.strip())
            self.assertTrue(text.strip(), qid)
            # Die Angaben dürfen die richtige Antwort nicht verraten
            for o in q["options"]:
                if o["c"] and re.search(r"\d", o["t"]) and len(o["t"]) < 25:
                    self.assertNotIn(o["t"], text, f"{qid} verrät die Lösung")

    def test_titles_have_umlauts(self):
        tage = {d["id"]: d for t in self.index["teile"] for d in t["tage"]}
        self.assertIn("Liquidität", tage["tag06"]["titel"])
        titles = [d["titel"] for d in tage.values()] + [s["titel"] for s in self.sessions]
        for title in titles:
            for word in re.findall(r"[A-Za-zÄÖÜäöüß]+", title):
                if word.lower() in UMLAUT_WHITELIST:
                    continue
                self.assertNotRegex(word.lower(), r"ae|oe|ue", title)


if __name__ == "__main__":
    unittest.main()
