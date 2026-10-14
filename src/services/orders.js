import { ref, set, get, child, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, isFirebaseEnabled } from '../firebase.js';
import { orderBelongsToUser } from '../utils/orderMatch.js';
import { isCustomerUid } from '../utils/customerUid.js';

const ROOT = 'orders';

// database.rules.json only lets an admin list the orders collection. A customer
// signed in with a server-issued Firebase identity (see exchange-token.js) may list
// it only through a query on their own `ownerUid`, which is how "My orders" follows
// them across devices. Orders placed before sign-in, or as a guest, carry no
// ownerUid, so each browser also remembers the ids of the orders it placed and looks
// them up one by one (a single order is readable by anyone who knows its
// unguessable id — that is also how order tracking works).
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

// The signed-in customer's Firebase uid, or null for guests, admins and local mode.
export function currentCustomerUid() {
  const uid = isFirebaseEnabled ? auth?.currentUser?.uid : null;
  return isCustomerUid(uid) ? uid : null;
}

const ownedOrdersQuery = (ownerUid) => query(ref(db, ROOT), orderByChild('ownerUid'), equalTo(ownerUid));

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
  const remembered = Promise.all(readRememberedOrderIds().map((id) => getFirebaseOrder(id).catch(() => null))).then((orders) =>
    orders.some((order) => order && order.status !== 'Cancelled' && orderBelongsToUser(order, user))
  );
  const ownerUid = currentCustomerUid();
  if (!ownerUid) return remembered;
  // Orders tied to the verified phone follow the customer across devices.
  const owned = get(ownedOrdersQuery(ownerUid))
    .then((snapshot) => {
      let found = false;
      snapshot.forEach((row) => {
        if (row.val()?.status !== 'Cancelled') found = true;
      });
      return found;
    })
    .catch(() => false);
  return Promise.all([owned, remembered]).then(([a, b]) => a || b);
}

const byNewestFirst = (a, b) => new Date(b.placedAt) - new Date(a.placedAt);

// Live list of the signed-in customer's own orders. With Firebase this never lists
// the whole collection: it merges (de-duplicated by id) the orders owned by the
// customer's verified uid (a query constrained to their own ownerUid) with the orders
// this browser remembers placing, looked up by id and matched to `user`. It restarts
// when the Firebase identity changes, e.g. when it finishes restoring after a reload.
export function subscribeToMyOrders(user, callback) {
  if (!isFirebaseEnabled) {
    return subscribeToOrders((rows) => callback(rows.filter((o) => orderBelongsToUser(o, user)).sort(byNewestFirst)));
  }
  let stopCurrent = () => {};
  const stopAuthWatch = onAuthStateChanged(auth, () => {
    stopCurrent();
    stopCurrent = listenToMyOrders(user, currentCustomerUid(), callback);
  });
  return () => {
    stopAuthWatch();
    stopCurrent();
  };
}

function listenToMyOrders(user, ownerUid, callback) {
  const ids = readRememberedOrderIds();
  if (ids.length === 0 && !ownerUid) {
    callback([]);
    return () => {};
  }
  const remembered = new Map();
  const reported = new Set();
  let owned = ownerUid ? null : new Map();
  const emit = () => {
    // Wait until every source has reported once so the list doesn't flicker in piecemeal.
    if (owned === null || reported.size < ids.length) return;
    const merged = new Map();
    remembered.forEach((order, id) => {
      if (orderBelongsToUser(order, user)) merged.set(id, order);
    });
    owned.forEach((order, id) => merged.set(id, order));
    callback([...merged.values()].sort(byNewestFirst));
  };
  const unsubscribes = ids.map((id) =>
    subscribeToOrder(id, (order) => {
      reported.add(id);
      if (order) remembered.set(id, order);
      else remembered.delete(id);
      emit();
    })
  );
  if (ownerUid) {
    const setOwned = (snapshot) => {
      owned = new Map();
      if (snapshot) {
        snapshot.forEach((row) => {
          const order = row.val();
          if (order) owned.set(row.key, order);
        });
      }
      emit();
    };
    unsubscribes.push(onValue(ownedOrdersQuery(ownerUid), setOwned, () => setOwned(null)));
  }
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

