// localStorage-Kapselung: funktioniert auch, wenn Speicher gesperrt oder voll ist.
const PREFIX = "m094.";
const memory = new Map(); // Ersatz, falls localStorage nicht verfügbar ist

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return memory.has(key) ? memory.get(key) : fallback;
  }
}

export function save(key, value) {
  memory.set(key, value);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* nur im Speicher */
  }
}

export function remove(key) {
  memory.delete(key);
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignorieren */
  }
}

/** Letztes Ergebnis je Frage im Übungsmodus: { [frageId]: true|false } */
export function getProgress() {
  return load("fortschritt", {});
}

export function setResult(id, ok) {
  const p = getProgress();
  p[id] = ok;
  save("fortschritt", p);
}
