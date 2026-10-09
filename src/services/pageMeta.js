import { onValue, ref, remove, set } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const PATH = 'settings/pageMeta';

const readLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(PATH) || '{}');
  } catch {
    return {};
  }
};

const localListeners = new Set();

// Overrides keyed by pageMetaKey(path): { title, description, metaTags }.
export function subscribeToPageMeta(callback) {
  if (!isFirebaseEnabled) {
    localListeners.add(callback);
    callback(readLocal());
    return () => localListeners.delete(callback);
  }
  return onValue(
    ref(db, PATH),
    (snapshot) => callback(snapshot.val() ?? {}),
    () => callback({})
  );
}

// An entry with nothing set removes the override so the route falls back to its default head.
export function savePageMeta(key, entry) {
  const isEmpty = !entry.title && !entry.description && entry.metaTags.length === 0;
  if (!isFirebaseEnabled) {
    const all = readLocal();
    if (isEmpty) delete all[key];
    else all[key] = entry;
    localStorage.setItem(PATH, JSON.stringify(all));
    localListeners.forEach((listener) => listener(all));
    return Promise.resolve();
  }
  return isEmpty ? remove(ref(db, `${PATH}/${key}`)) : set(ref(db, `${PATH}/${key}`), entry);
}
