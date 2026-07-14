import { onValue, push, ref, remove, serverTimestamp } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const ROOT = 'adminProducts';
const DISABLED_ERROR = new Error('Realtime Database is not configured yet. Add Firebase credentials to .env.');

const generateSku = () => `A2Z-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

export function subscribeToAdminProducts(callback) {
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
      rows.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
      callback(rows, null);
    },
    (error) => callback([], error)
  );
}

// product: { title, description, hashtags: string[], categoryId, categoryTitle,
//            price: number, hsnCode, colors: string[], sizes: [{ size, stock }] }
export function createAdminProduct(product) {
  if (!isFirebaseEnabled) return Promise.reject(DISABLED_ERROR);
  return push(ref(db, ROOT), {
    ...product,
    sku: generateSku(),
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  });
}

export function deleteAdminProduct(id) {
  if (!isFirebaseEnabled) return Promise.reject(DISABLED_ERROR);
  return remove(ref(db, `${ROOT}/${id}`));
}
