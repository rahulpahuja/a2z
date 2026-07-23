import { onValue, push, ref, remove, serverTimestamp, set, update } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const ROOT = 'collections';

function getLocalCollections() {
  try {
    const data = localStorage.getItem(ROOT);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalCollections(collections) {
  localStorage.setItem(ROOT, JSON.stringify(collections));
}

const localListeners = new Set();
function notifyLocalListeners() {
  const collections = sortByOrder(getLocalCollections());
  localListeners.forEach((listener) => listener(collections, null));
}

function sortByOrder(rows) {
  return [...rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function subscribeToCollections(callback) {
  if (!isFirebaseEnabled) {
    localListeners.add(callback);
    callback(sortByOrder(getLocalCollections()), null);
    return () => {
      localListeners.delete(callback);
    };
  }
  return onValue(
    ref(db, ROOT),
    (snapshot) => {
      const rows = [];
      snapshot.forEach((child) => {
        rows.push({ id: child.key, ...child.val() });
      });
      callback(sortByOrder(rows), null);
    },
    (error) => callback([], error)
  );
}

export function createCollection({ name, productIds, heroProductId, published }) {
  const payload = {
    name: name.trim(),
    productIds: productIds || [],
    heroProductId: heroProductId || (productIds && productIds[0]) || '',
    published: !!published,
  };

  if (!isFirebaseEnabled) {
    const collections = getLocalCollections();
    const maxOrder = collections.reduce((max, c) => Math.max(max, c.order ?? 0), -1);
    const newCollection = {
      id: `col_${Date.now()}`,
      ...payload,
      order: maxOrder + 1,
      createdAt: Date.now(),
    };
    collections.push(newCollection);
    setLocalCollections(collections);
    notifyLocalListeners();
    return Promise.resolve(newCollection);
  }

  const newRef = push(ref(db, ROOT));
  return set(newRef, {
    ...payload,
    order: Date.now(),
    createdAt: serverTimestamp(),
  }).then(() => ({ id: newRef.key, ...payload }));
}

export function updateCollection(id, { name, productIds, heroProductId, published }) {
  const payload = {
    name: name.trim(),
    productIds: productIds || [],
    heroProductId: heroProductId || (productIds && productIds[0]) || '',
    published: !!published,
  };

  if (!isFirebaseEnabled) {
    const collections = getLocalCollections();
    const index = collections.findIndex((c) => c.id === id);
    if (index === -1) return Promise.reject(new Error('Collection not found.'));
    collections[index] = { ...collections[index], ...payload };
    setLocalCollections(collections);
    notifyLocalListeners();
    return Promise.resolve(collections[index]);
  }

  return update(ref(db, `${ROOT}/${id}`), payload);
}

export function deleteCollection(id) {
  if (!isFirebaseEnabled) {
    const collections = getLocalCollections().filter((c) => c.id !== id);
    setLocalCollections(collections);
    notifyLocalListeners();
    return Promise.resolve();
  }
  return remove(ref(db, `${ROOT}/${id}`));
}

// Swaps the `order` value of two collections so admin-controlled up/down
// reordering sticks across reloads instead of resetting to createdAt order.
export function reorderCollections(collectionA, collectionB) {
  if (!isFirebaseEnabled) {
    const collections = getLocalCollections();
    const a = collections.find((c) => c.id === collectionA.id);
    const b = collections.find((c) => c.id === collectionB.id);
    if (!a || !b) return Promise.resolve();
    const tempOrder = a.order;
    a.order = b.order;
    b.order = tempOrder;
    setLocalCollections(collections);
    notifyLocalListeners();
    return Promise.resolve();
  }

  const updates = {};
  updates[`${ROOT}/${collectionA.id}/order`] = collectionB.order ?? 0;
  updates[`${ROOT}/${collectionB.id}/order`] = collectionA.order ?? 0;
  return update(ref(db), updates);
}
