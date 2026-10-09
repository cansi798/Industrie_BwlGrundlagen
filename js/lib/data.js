// Lädt Gliederung und Fragen (relativ zur Seite, mit Speicher-Cache).
let indexPromise = null;
const sessionCache = new Map();

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

export function loadIndex() {
  indexPromise ??= fetchJson("data/index.json").catch((e) => {
    indexPromise = null;
    throw e;
  });
  return indexPromise;
}

export function allDays(index) {
  return index.teile.flatMap((t) => t.tage.map((d) => ({ ...d, teil: t.id })));
}

export function allSessions(index) {
  return allDays(index).flatMap((d) => d.sessions.map((s) => ({ ...s, tag: d })));
}

export async function loadSession(sid) {
  if (!sessionCache.has(sid)) {
    const index = await loadIndex();
    const s = allSessions(index).find((x) => x.id === sid);
    if (!s) throw new Error(`Unbekannte Session: ${sid}`);
    sessionCache.set(sid, fetchJson(s.datei).catch((e) => {
      sessionCache.delete(sid);
      throw e;
    }));
  }
  return sessionCache.get(sid);
}
