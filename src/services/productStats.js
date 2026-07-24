import { increment, limitToLast, onValue, orderByChild, query, ref, update } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const ROOT = 'productStats';
const VIEWED_KEY_PREFIX = 'a2z_viewed_';

function getLocalStats() {
  try {
    const data = localStorage.getItem(ROOT);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function setLocalStats(stats) {
  localStorage.setItem(ROOT, JSON.stringify(stats));
}

const statsListeners = new Map(); // productId -> Set of listeners
const topProductsListeners = new Set(); // Set of { field, count, callback }

function notifyStatsListeners(productId) {
  const stats = getLocalStats();
  const prodStat = stats[productId] || { views: 0, purchases: 0 };
  const listeners = statsListeners.get(productId);
  if (listeners) {
    listeners.forEach((listener) => listener({ views: prodStat.views ?? 0, purchases: prodStat.purchases ?? 0 }));
  }
  notifyTopProductsListeners();
}

function notifyTopProductsListeners() {
  const stats = getLocalStats();
  topProductsListeners.forEach(({ field, count, callback }) => {
    const rows = [];
    Object.keys(stats).forEach((id) => {
      rows.push({ id, ...stats[id] });
    });
    rows.sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0));
    callback(rows.slice(0, count).filter((row) => typeof row[field] === 'number' && row[field] > 0));
  });
}

export function recordView(productId) {
  if (!isFirebaseEnabled) {
    const sessionKey = `${VIEWED_KEY_PREFIX}${productId}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
    const stats = getLocalStats();
    const prodStat = stats[productId] || { views: 0, purchases: 0 };
    prodStat.views = (prodStat.views || 0) + 1;
    stats[productId] = prodStat;
    setLocalStats(stats);
    notifyStatsListeners(productId);
    return;
  }
  const sessionKey = `${VIEWED_KEY_PREFIX}${productId}`;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, '1');
  update(ref(db, `${ROOT}/${productId}`), { views: increment(1) }).catch(() => {
    sessionStorage.removeItem(sessionKey);
  });
}

export function recordPurchase(productId, quantity = 1) {
  if (!isFirebaseEnabled) {
    const stats = getLocalStats();
    const prodStat = stats[productId] || { views: 0, purchases: 0 };
    prodStat.purchases = (prodStat.purchases || 0) + quantity;
    stats[productId] = prodStat;
    setLocalStats(stats);
    notifyStatsListeners(productId);
    return Promise.resolve();
  }
  return update(ref(db, `${ROOT}/${productId}`), { purchases: increment(quantity) });
}

export function subscribeToProductStats(productId, callback) {
  if (!isFirebaseEnabled) {
    if (!statsListeners.has(productId)) {
      statsListeners.set(productId, new Set());
    }
    statsListeners.get(productId).add(callback);
    const stats = getLocalStats();
    const prodStat = stats[productId] || { views: 0, purchases: 0 };
    callback({ views: prodStat.views ?? 0, purchases: prodStat.purchases ?? 0 });
    return () => {
      const listeners = statsListeners.get(productId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          statsListeners.delete(productId);
        }
      }
    };
  }
  return onValue(ref(db, `${ROOT}/${productId}`), (snapshot) => {
    const data = snapshot.val();
    callback({ views: data?.views ?? 0, purchases: data?.purchases ?? 0 });
  });
}

export function subscribeToTopProducts(field, count, callback) {
  if (!isFirebaseEnabled) {
    const listenerObj = { field, count, callback };
    topProductsListeners.add(listenerObj);
    const stats = getLocalStats();
    const rows = [];
    Object.keys(stats).forEach((id) => {
      rows.push({ id, ...stats[id] });
    });
    rows.sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0));
    callback(rows.slice(0, count).filter((row) => typeof row[field] === 'number' && row[field] > 0));
    return () => {
      topProductsListeners.delete(listenerObj);
    };
  }
  const topQuery = query(ref(db, ROOT), orderByChild(field), limitToLast(count));
  return onValue(
    topQuery,
    (snapshot) => {
      const rows = [];
      snapshot.forEach((child) => {
        rows.push({ id: child.key, ...child.val() });
      });
      callback(rows.reverse().filter((row) => typeof row[field] === 'number' && row[field] > 0));
    },
    () => callback([])
  );
}
