import { onValue, push, ref, remove, serverTimestamp, set, update } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const ROOT = 'shots';

function getLocalShots() {
  try {
    const data = localStorage.getItem(ROOT);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalShots(shots) {
  localStorage.setItem(ROOT, JSON.stringify(shots));
}

const localListeners = new Set();
function notifyLocalListeners() {
  const shots = sortByOrder(getLocalShots());
  localListeners.forEach((listener) => listener(shots, null));
}

function sortByOrder(rows) {
  return [...rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// Fires on every create/update/delete with the full, ordered list of shots
// (productId + which existing product video it points to, plus enabled
// state) so both the admin manager and the public feed can stay in sync.
export function subscribeToShots(callback) {
  if (!isFirebaseEnabled) {
    localListeners.add(callback);
    callback(sortByOrder(getLocalShots()), null);
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

// productId/videoUrl only — a shot never stores its own video file, it just
// points at one of the videos already uploaded for that product via Product
// Videos.
export function createShot({ productId, videoUrl }) {
  const payload = {
    productId,
    videoUrl,
    enabled: true,
  };

  if (!isFirebaseEnabled) {
    const shots = getLocalShots();
    const maxOrder = shots.reduce((max, s) => Math.max(max, s.order ?? 0), -1);
    const newShot = {
      id: `shot_${Date.now()}`,
      ...payload,
      order: maxOrder + 1,
      createdAt: Date.now(),
    };
    shots.push(newShot);
    setLocalShots(shots);
    notifyLocalListeners();
    return Promise.resolve(newShot);
  }

  const newRef = push(ref(db, ROOT));
  return set(newRef, {
    ...payload,
    order: Date.now(),
    createdAt: serverTimestamp(),
  }).then(() => ({ id: newRef.key, ...payload }));
}

export function updateShot(id, patch) {
  if (!isFirebaseEnabled) {
    const shots = getLocalShots();
    const index = shots.findIndex((s) => s.id === id);
    if (index === -1) return Promise.reject(new Error('Shot not found.'));
    shots[index] = { ...shots[index], ...patch };
    setLocalShots(shots);
    notifyLocalListeners();
    return Promise.resolve(shots[index]);
  }
  return update(ref(db, `${ROOT}/${id}`), patch);
}

export function deleteShot(id) {
  if (!isFirebaseEnabled) {
    const shots = getLocalShots().filter((s) => s.id !== id);
    setLocalShots(shots);
    notifyLocalListeners();
    return Promise.resolve();
  }
  return remove(ref(db, `${ROOT}/${id}`));
}

// Swaps the `order` value of two shots so admin-controlled up/down
// reordering sticks across reloads instead of resetting to createdAt order.
export function reorderShots(shotA, shotB) {
  if (!isFirebaseEnabled) {
    const shots = getLocalShots();
    const a = shots.find((s) => s.id === shotA.id);
    const b = shots.find((s) => s.id === shotB.id);
    if (!a || !b) return Promise.resolve();
    const tempOrder = a.order;
    a.order = b.order;
    b.order = tempOrder;
    setLocalShots(shots);
    notifyLocalListeners();
    return Promise.resolve();
  }

  const updates = {};
  updates[`${ROOT}/${shotA.id}/order`] = shotB.order ?? 0;
  updates[`${ROOT}/${shotB.id}/order`] = shotA.order ?? 0;
  return update(ref(db), updates);
}
