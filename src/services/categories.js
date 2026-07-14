import { onValue, push, ref, remove, serverTimestamp } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const ROOT = 'categories';

const DEFAULT_CATEGORIES = [
  { id: 'cat_anarkali', title: 'Anarkali', createdAt: 0 },
  { id: 'cat_saree', title: 'Saree', createdAt: 0 },
  { id: 'cat_coord', title: 'Coord Set', createdAt: 0 },
  { id: 'cat_lehenga', title: 'Lehenga', createdAt: 0 },
  { id: 'cat_kurti', title: 'Kurti', createdAt: 0 },
  { id: 'cat_dress', title: 'Dress', createdAt: 0 },
  { id: 'cat_gown', title: 'Gown', createdAt: 0 },
];

function getLocalCategories() {
  try {
    const data = localStorage.getItem(ROOT);
    if (!data) {
      localStorage.setItem(ROOT, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

function setLocalCategories(categories) {
  localStorage.setItem(ROOT, JSON.stringify(categories));
}

const localListeners = new Set();
function notifyLocalListeners() {
  const categories = getLocalCategories();
  categories.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  localListeners.forEach((listener) => listener(categories, null));
}

export function subscribeToCategories(callback) {
  if (!isFirebaseEnabled) {
    localListeners.add(callback);
    const categories = getLocalCategories();
    categories.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    callback(categories, null);
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

export function createCategory({ title }) {
  if (!isFirebaseEnabled) {
    const categories = getLocalCategories();
    const newCategory = {
      id: `cat_${Date.now()}`,
      title: title.trim(),
      createdAt: Date.now(),
    };
    categories.push(newCategory);
    setLocalCategories(categories);
    notifyLocalListeners();
    return Promise.resolve(newCategory);
  }
  return push(ref(db, ROOT), {
    title: title.trim(),
    createdAt: serverTimestamp(),
  });
}

export function deleteCategory(id) {
  if (!isFirebaseEnabled) {
    let categories = getLocalCategories();
    categories = categories.filter((c) => c.id !== id);
    setLocalCategories(categories);
    notifyLocalListeners();
    return Promise.resolve();
  }
  return remove(ref(db, `${ROOT}/${id}`));
}
