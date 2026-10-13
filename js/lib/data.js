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

export const WDH_ALLE = "wdh-alle";
let wdhPromise = null;

export function loadWiederholung() {
  wdhPromise ??= fetchJson("data/wiederholung.json").catch((e) => {
    wdhPromise = null;
    throw e;
  });
  return wdhPromise;
}

async function ladeDatei(sid) {
  if (sid === WDH_ALLE) {
    const { sessions } = await loadWiederholung();
    return (await Promise.all(sessions.map((s) => loadSession(s.id)))).flat();
  }
  const s = sid.startsWith("wdh-")
    ? (await loadWiederholung()).sessions.find((x) => x.id === sid)
    : allSessions(await loadIndex()).find((x) => x.id === sid);
  if (!s) throw new Error(`Unbekannte Session: ${sid}`);
  return fetchJson(s.datei);
}

export async function loadSession(sid) {
  if (!sessionCache.has(sid)) {
    sessionCache.set(sid, ladeDatei(sid).catch((e) => {
      sessionCache.delete(sid);
      throw e;
    }));
  }
  return sessionCache.get(sid);
}
