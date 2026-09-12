import { ref, set, get, child, onValue } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';
import { orderBelongsToUser } from '../utils/orderMatch.js';

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
  // Firebase's set() throws synchronously if any value in the tree is
  // undefined (e.g. items missing optional fields like `alt`) — round-trip
  // through JSON to drop those keys instead of crashing the caller.
  return set(ref(db, `${ROOT}/${order.id}`), JSON.parse(JSON.stringify(order)));
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

export function updateFirebaseOrder(order) {
  return createFirebaseOrder(order);
}

// "First order only" coupons need to know whether this customer has ever
// successfully completed one before — reuses the same phone/email/name/
// customerId matching MyOrdersPage already relies on for "my orders" so the
// two notions of "belongs to this customer" can't drift apart.
export function hasPriorOrders(user) {
  if (!user) return Promise.resolve(false);
  if (!isFirebaseEnabled) {
    const localOrders = JSON.parse(localStorage.getItem(ROOT) || '[]');
    return Promise.resolve(localOrders.some((o) => o.status !== 'Cancelled' && orderBelongsToUser(o, user)));
  }
  return get(ref(db, ROOT)).then((snapshot) => {
    let found = false;
    snapshot.forEach((child) => {
      const order = child.val();
      if (order.status !== 'Cancelled' && orderBelongsToUser(order, user)) found = true;
    });
    return found;
  });
}

export function subscribeToOrder(id, callback) {
  if (!isFirebaseEnabled) {
    const getOrder = () => {
      const localOrders = JSON.parse(localStorage.getItem(ROOT) || '[]');
      return localOrders.find((o) => o.id === id) || null;
    };
    callback(getOrder());
    const handleStorage = () => {
      callback(getOrder());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }
  return onValue(
    ref(db, `${ROOT}/${id}`),
    (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : null);
    },
    () => callback(null)
  );
}

