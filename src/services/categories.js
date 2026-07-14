import { onValue, push, ref, remove, serverTimestamp } from 'firebase/database';
import { db } from '../firebase.js';

const ROOT = 'categories';

export function subscribeToCategories(callback) {
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
  return push(ref(db, ROOT), {
    title: title.trim(),
    createdAt: serverTimestamp(),
  });
}

export function deleteCategory(id) {
  return remove(ref(db, `${ROOT}/${id}`));
}
