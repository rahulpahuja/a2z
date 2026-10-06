// localStorage-backed key/value store used when Firebase isn't configured
// (local dev without .env). Mirrors the realtime subscribe contract of the
// Firebase-backed services so callers never branch on the backend.
export function createLocalStore(storageKey) {
  const listeners = new Map();

  const readAll = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch {
      return {};
    }
  };

  const read = (key) => readAll()[key] ?? null;

  const write = (key, value) => {
    const all = readAll();
    if (value === null || value === undefined) {
      delete all[key];
    } else {
      all[key] = value;
    }
    localStorage.setItem(storageKey, JSON.stringify(all));
    listeners.get(key)?.forEach((listener) => listener(read(key)));
  };

  const subscribe = (key, listener) => {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(listener);
    listener(read(key));
    return () => {
      listeners.get(key)?.delete(listener);
    };
  };

  return { read, write, subscribe };
}
