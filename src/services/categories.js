import { onValue, push, ref, remove, serverTimestamp, update, get } from 'firebase/database';
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

export function updateCategory(id, { title }) {
  if (!isFirebaseEnabled) {
    const categories = getLocalCategories();
    const catIndex = categories.findIndex((c) => c.id === id);
    if (catIndex !== -1) {
      const oldTitle = categories[catIndex].title;
      categories[catIndex] = {
        ...categories[catIndex],
        title: title.trim(),
      };
      setLocalCategories(categories);
      notifyLocalListeners();

      // Update corresponding subcategories categoryTitle in localStorage
      try {
        const subData = localStorage.getItem('subcategories');
        if (subData) {
          const subcategories = JSON.parse(subData);
          let subChanged = false;
          subcategories.forEach((sub) => {
            if (sub.categoryId === id) {
              sub.categoryTitle = title.trim();
              subChanged = true;
            }
          });
          if (subChanged) {
            localStorage.setItem('subcategories', JSON.stringify(subcategories));
          }
        }
      } catch (e) {
        console.error('Error updating local subcategories categoryTitle:', e);
      }
      return Promise.resolve();
    }
    return Promise.reject(new Error('Category not found.'));
  }

  // Update in Firebase atomic updates
  return get(ref(db, 'subcategories')).then((snapshot) => {
    const updates = {};
    updates[`categories/${id}/title`] = title.trim();

    if (snapshot.exists()) {
      snapshot.forEach((childSnap) => {
        const sub = childSnap.val();
        if (sub.categoryId === id) {
          updates[`subcategories/${childSnap.key}/categoryTitle`] = title.trim();
        }
      });
    }
    return update(ref(db), updates);
  });
}
