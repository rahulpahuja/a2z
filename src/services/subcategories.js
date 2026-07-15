import { onValue, push, ref, remove, serverTimestamp } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const ROOT = 'subcategories';

function getLocalSubcategories() {
  try {
    const data = localStorage.getItem(ROOT);
    if (!data) {
      localStorage.setItem(ROOT, JSON.stringify([]));
      return [];
    }
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function setLocalSubcategories(subcategories) {
  localStorage.setItem(ROOT, JSON.stringify(subcategories));
}

const localListeners = new Set();
function notifyLocalListeners() {
  const subcategories = getLocalSubcategories();
  subcategories.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  localListeners.forEach((listener) => listener(subcategories, null));
}

export function subscribeToSubcategories(callback) {
  if (!isFirebaseEnabled) {
    localListeners.add(callback);
    const subcategories = getLocalSubcategories();
    subcategories.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    callback(subcategories, null);
    return () => {
      localListeners.delete(callback);
    };
  }
  return onValue(
    ref(db, ROOT),
    (snapshot) => {
      const rows = [];
      snapshot.forEach((child) => {
        rows.push({ id: child.key, ...child.val() });
      });
      rows.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      callback(rows, null);
    },
    (error) => callback([], error)
  );
}

export function createSubcategory({ title, categoryId, categoryTitle }) {
  if (!isFirebaseEnabled) {
    const subcategories = getLocalSubcategories();
    const newSubcategory = {
      id: `subcat_${Date.now()}`,
      title: title.trim(),
      categoryId,
      categoryTitle,
      createdAt: Date.now(),
    };
    subcategories.push(newSubcategory);
    setLocalSubcategories(subcategories);
    notifyLocalListeners();
    return Promise.resolve(newSubcategory);
  }
  return push(ref(db, ROOT), {
    title: title.trim(),
    categoryId,
    categoryTitle,
    createdAt: serverTimestamp(),
  });
}

export function deleteSubcategory(id) {
  if (!isFirebaseEnabled) {
    let subcategories = getLocalSubcategories();
    subcategories = subcategories.filter((s) => s.id !== id);
    setLocalSubcategories(subcategories);
    notifyLocalListeners();
    return Promise.resolve();
  }
  return remove(ref(db, `${ROOT}/${id}`));
}
