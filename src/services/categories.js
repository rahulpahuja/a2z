import { onValue, push, ref, remove, serverTimestamp } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const ROOT = 'categories';
const DISABLED_ERROR = new Error('Realtime Database is not configured yet. Add Firebase credentials to .env.');

export function subscribeToCategories(callback) {
  if (!isFirebaseEnabled) {
    callback([], DISABLED_ERROR);
    return () => {};
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
  if (!isFirebaseEnabled) return Promise.reject(DISABLED_ERROR);
  return push(ref(db, ROOT), {
    title: title.trim(),
    createdAt: serverTimestamp(),
  });
}

export function deleteCategory(id) {
  if (!isFirebaseEnabled) return Promise.reject(DISABLED_ERROR);
  return remove(ref(db, `${ROOT}/${id}`));
}
