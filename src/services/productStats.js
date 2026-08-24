import { increment, limitToLast, onValue, orderByChild, query, ref, update } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const ROOT = 'productStats';
const VIEWED_KEY_PREFIX = 'a2z_viewed_';

// Firebase Realtime Database keys can't contain . # $ [ ] / — referrer
// hostnames and UTM values need sanitizing before use as a key.
function sanitizeStatsKey(raw) {
  return String(raw).replace(/[.#$[\]/]/g, '_');
}

// Where did this view come from? Prefers ?utm_source= when present (an
// admin-controlled label from a marketing link), falling back to the
// referring page's hostname, or 'direct' for a same-site navigation or no
// referrer at all (typed URL, bookmark, most app/social in-app browsers).
function getReferrerLabel() {
  try {
    const utmSource = new URLSearchParams(window.location.search).get('utm_source');
    if (utmSource) return sanitizeStatsKey(utmSource.trim().toLowerCase());
    if (!document.referrer) return 'direct';
    const refHost = new URL(document.referrer).hostname.replace(/^www\./, '');
    if (refHost === window.location.hostname) return 'direct';
    return sanitizeStatsKey(refHost);
  } catch {
    return 'direct';
  }
}

function todayKey() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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
  const day = todayKey();
  const referrer = getReferrerLabel();

  if (!isFirebaseEnabled) {
    const sessionKey = `${VIEWED_KEY_PREFIX}${productId}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
    const stats = getLocalStats();
    const prodStat = stats[productId] || { views: 0, purchases: 0, daily: {} };
    prodStat.views = (prodStat.views || 0) + 1;
    prodStat.daily = prodStat.daily || {};
    const dayStat = prodStat.daily[day] || { views: 0, referrers: {} };
    dayStat.views += 1;
    dayStat.referrers[referrer] = (dayStat.referrers[referrer] || 0) + 1;
    prodStat.daily[day] = dayStat;
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
  update(ref(db, `${ROOT}/${productId}/daily/${day}`), {
    views: increment(1),
    [`referrers/${referrer}`]: increment(1),
  }).catch(() => {});
}

// Full productStats tree, incl. each product's { daily: { 'YYYY-MM-DD': {
// views, referrers } } } breakdown — used by the Analytics page to build
// a monthly per-product + sitewide referrer report client-side (same
// load-then-aggregate pattern AdminSalesPage uses for orders).
export function subscribeToAllProductStats(callback) {
  if (!isFirebaseEnabled) {
    callback(getLocalStats());
    return () => {};
  }
  return onValue(
    ref(db, ROOT),
    (snapshot) => callback(snapshot.val() || {}),
    () => callback({})
  );
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
