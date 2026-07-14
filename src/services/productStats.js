import { increment, limitToLast, onValue, orderByChild, query, ref, update } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const ROOT = 'productStats';
const VIEWED_KEY_PREFIX = 'a2z_viewed_';

export function recordView(productId) {
  if (!isFirebaseEnabled) return;
  const sessionKey = `${VIEWED_KEY_PREFIX}${productId}`;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, '1');
  update(ref(db, `${ROOT}/${productId}`), { views: increment(1) }).catch(() => {
    sessionStorage.removeItem(sessionKey);
  });
}

export function recordPurchase(productId, quantity = 1) {
  if (!isFirebaseEnabled) return Promise.resolve();
  return update(ref(db, `${ROOT}/${productId}`), { purchases: increment(quantity) });
}

export function subscribeToProductStats(productId, callback) {
  if (!isFirebaseEnabled) {
    callback({ views: 0, purchases: 0 });
    return () => {};
  }
  return onValue(ref(db, `${ROOT}/${productId}`), (snapshot) => {
    const data = snapshot.val();
    callback({ views: data?.views ?? 0, purchases: data?.purchases ?? 0 });
  });
}

export function subscribeToTopProducts(field, count, callback) {
  if (!isFirebaseEnabled) {
    callback([]);
    return () => {};
  }
  const topQuery = query(ref(db, ROOT), orderByChild(field), limitToLast(count));
  return onValue(
    topQuery,
    (snapshot) => {
      const rows = [];
      snapshot.forEach((child) => {
        rows.push({ id: child.key, ...child.val() });
      });
      // limitToLast returns ascending order; flip so the highest value comes first.
      callback(rows.reverse().filter((row) => typeof row[field] === 'number' && row[field] > 0));
    },
    () => callback([])
  );
}
