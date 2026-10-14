import { ref, set, get, child, onValue } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';
import { orderBelongsToUser } from '../utils/orderMatch.js';

const ROOT = 'orders';

// database.rules.json only lets an admin list the orders collection, so a
// customer's browser cannot ask "which orders are mine?". Instead each browser
// remembers the ids of the orders it placed and looks them up one by one (a
// single order is readable by anyone who knows its unguessable id — that is
// also how order tracking works).
const MY_ORDER_IDS_KEY = 'a2z_my_order_ids';
const MAX_REMEMBERED_ORDER_IDS = 50;

export function readRememberedOrderIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MY_ORDER_IDS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string' && id) : [];
  } catch {
    return [];
  }
}

export function rememberOrderId(id) {
  if (!id) return;
  try {
    const ids = readRememberedOrderIds().filter((existing) => existing !== id);
    ids.push(id);
    localStorage.setItem(MY_ORDER_IDS_KEY, JSON.stringify(ids.slice(-MAX_REMEMBERED_ORDER_IDS)));
  } catch {
    // Storage can be unavailable (private mode); "My Orders" then just starts empty.
  }
}

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

// Records the outcome of booking a shipment on an order that already exists.
// Writes only the `shipment` child instead of re-saving the whole order: the
// checkout browser is allowed to set that one child once (see
// database.rules.json) but not to overwrite an order.
export function setOrderShipment(orderId, shipment) {
  if (!isFirebaseEnabled) {
    const localOrders = JSON.parse(localStorage.getItem(ROOT) || '[]');
    const idx = localOrders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      localOrders[idx] = { ...localOrders[idx], shipment };
      localStorage.setItem(ROOT, JSON.stringify(localOrders));
    }
    return Promise.resolve();
  }
  return set(ref(db, `${ROOT}/${orderId}/shipment`), JSON.parse(JSON.stringify(shipment)));
}

// "First order only" coupons need to know whether this customer has ever
// successfully completed one before — reuses the same phone/email/name/
// customerId matching MyOrdersPage already relies on for "my orders" so the
// two notions of "belongs to this customer" can't drift apart. Only orders this
// browser placed are visible to a customer (see MY_ORDER_IDS_KEY), so a
// returning customer on a new device is treated as a first-time buyer; truly
// enforcing the rule needs a server-side check.
export function hasPriorOrders(user) {
  if (!user) return Promise.resolve(false);
  if (!isFirebaseEnabled) {
    const localOrders = JSON.parse(localStorage.getItem(ROOT) || '[]');
    return Promise.resolve(localOrders.some((o) => o.status !== 'Cancelled' && orderBelongsToUser(o, user)));
  }
  return Promise.all(readRememberedOrderIds().map((id) => getFirebaseOrder(id).catch(() => null))).then((orders) =>
    orders.some((order) => order && order.status !== 'Cancelled' && orderBelongsToUser(order, user))
  );
}

const byNewestFirst = (a, b) => new Date(b.placedAt) - new Date(a.placedAt);

// Live list of the signed-in customer's own orders. With Firebase this
// subscribes to each order id this browser placed rather than listing the whole
// collection (which only admins may do), then keeps the ones that match `user`.
export function subscribeToMyOrders(user, callback) {
  if (!isFirebaseEnabled) {
    return subscribeToOrders((rows) => callback(rows.filter((o) => orderBelongsToUser(o, user)).sort(byNewestFirst)));
  }
  const ids = readRememberedOrderIds();
  if (ids.length === 0) {
    callback([]);
    return () => {};
  }
  const latest = new Map();
  const reported = new Set();
  const unsubscribes = ids.map((id) =>
    subscribeToOrder(id, (order) => {
      reported.add(id);
      if (order) latest.set(id, order);
      else latest.delete(id);
      // Wait until every id has reported once so the list doesn't flicker in piecemeal.
      if (reported.size < ids.length) return;
      callback([...latest.values()].filter((o) => orderBelongsToUser(o, user)).sort(byNewestFirst));
    })
  );
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
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

