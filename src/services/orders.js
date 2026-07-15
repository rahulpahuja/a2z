import { ref, set, get, child, onValue } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const ROOT = 'orders';

export function createFirebaseOrder(order) {
  if (!isFirebaseEnabled) {
    const localOrders = JSON.parse(localStorage.getItem(ROOT) || '[]');
    // Filter duplicates
    const filtered = localOrders.filter((o) => o.id !== order.id);
    filtered.push(order);
    localStorage.setItem(ROOT, JSON.stringify(filtered));
    return Promise.resolve(order);
  }
  return set(ref(db, `${ROOT}/${order.id}`), order);
}

export function getFirebaseOrder(id) {
  if (!isFirebaseEnabled) {
    const localOrders = JSON.parse(localStorage.getItem(ROOT) || '[]');
    const order = localOrders.find((o) => o.id === id);
    return Promise.resolve(order || null);
  }
  return get(child(ref(db), `${ROOT}/${id}`)).then((snapshot) => {
    return snapshot.exists() ? snapshot.val() : null;
  });
}

export function subscribeToOrders(callback) {
  if (!isFirebaseEnabled) {
    const localOrders = JSON.parse(localStorage.getItem(ROOT) || '[]');
    callback(localOrders);
    return () => {};
  }
  return onValue(
    ref(db, ROOT),
    (snapshot) => {
      const rows = [];
      snapshot.forEach((child) => {
        rows.push(child.val());
      });
      // Sort newest first
      rows.sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
      callback(rows);
    },
    () => callback([])
  );
}
