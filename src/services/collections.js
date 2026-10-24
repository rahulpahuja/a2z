import { get, onValue, push, ref, remove, serverTimestamp, set, update } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';
import { MAX_PUBLISHED_COLLECTIONS, PUBLISH_LIMIT_MESSAGE, getDisplayMode } from '../utils/collections.js';

export class CollectionLimitError extends Error {
  constructor() {
    super(PUBLISH_LIMIT_MESSAGE);
    this.name = 'CollectionLimitError';
    this.code = 'PUBLISH_LIMIT';
  }
}

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

// The one place a collection's stored shape is defined; create and update both go through it.
function toPayload({ name, productIds, heroProductId, published, coverImage, displayMode }) {
  return {
    name: name.trim(),
    productIds: productIds || [],
    heroProductId: heroProductId || (productIds && productIds[0]) || '',
    published: !!published,
    coverImage: coverImage || '',
    displayMode: getDisplayMode({ displayMode }),
  };
}

async function loadAllCollections() {
  if (!isFirebaseEnabled) return getLocalCollections();
  const snapshot = await get(ref(db, ROOT));
  return Object.entries(snapshot.val() ?? {}).map(([id, value]) => ({ id, ...value }));
}

// Enforces the publish limit and stamps the dates: `updatedAt` on every save, and `publishedAt` whenever a
// collection goes from hidden to published. Collections already published keep their original date.
async function prepare(id, input) {
  const payload = toPayload(input);
  const all = await loadAllCollections();
  const previous = all.find((c) => c.id === id);
  const now = Date.now();
  const stamped = { ...payload, updatedAt: now };
  if (payload.published && !previous?.published) {
    const others = all.filter((c) => c.id !== id && c.published).length;
    if (others >= MAX_PUBLISHED_COLLECTIONS) throw new CollectionLimitError();
    stamped.publishedAt = now;
  } else if (payload.published && previous?.publishedAt) {
    stamped.publishedAt = previous.publishedAt;
  }
  return stamped;
}

export async function createCollection(input) {
  const payload = await prepare(null, input);

  if (!isFirebaseEnabled) {
    const collections = getLocalCollections();
    const maxOrder = collections.reduce((max, c) => Math.max(max, c.order ?? 0), -1);
    const newCollection = {
      id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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

export async function updateCollection(id, input) {
  const payload = await prepare(id, input);

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

// Persists an explicit admin-chosen order (e.g. typing "3" into a position
// field) by re-numbering every collection in `orderedCollections` 0..n-1.
export function setCollectionOrder(orderedCollections) {
  if (!isFirebaseEnabled) {
    const collections = getLocalCollections();
    orderedCollections.forEach((c, idx) => {
      const match = collections.find((row) => row.id === c.id);
      if (match) match.order = idx;
    });
    setLocalCollections(collections);
    notifyLocalListeners();
    return Promise.resolve();
  }

  const updates = {};
  orderedCollections.forEach((c, idx) => {
    updates[`${ROOT}/${c.id}/order`] = idx;
  });
  return update(ref(db), updates);
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
