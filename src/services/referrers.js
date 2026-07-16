import { onValue, push, ref, remove, serverTimestamp } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const ROOT = 'referrers';

function getLocalReferrers() {
  try {
    const data = localStorage.getItem(ROOT);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalReferrers(referrers) {
  localStorage.setItem(ROOT, JSON.stringify(referrers));
}

const localListeners = new Set();
function notifyLocalListeners() {
  const referrers = getLocalReferrers();
  referrers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  localListeners.forEach((listener) => listener(referrers, null));
}

export function subscribeToReferrers(callback) {
  if (!isFirebaseEnabled) {
    localListeners.add(callback);
    const referrers = getLocalReferrers();
    referrers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    callback(referrers, null);
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
      rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      callback(rows, null);
    },
    (error) => callback([], error)
  );
}

export function createReferrer({ name, phone }) {
  if (!isFirebaseEnabled) {
    const referrers = getLocalReferrers();
    const newReferrer = {
      id: `ref_${Date.now()}`,
      name: name.trim(),
      phone: (phone || '').trim(),
      createdAt: Date.now(),
    };
    referrers.push(newReferrer);
    setLocalReferrers(referrers);
    notifyLocalListeners();
    return Promise.resolve(newReferrer);
  }
  return push(ref(db, ROOT), {
    name: name.trim(),
    phone: (phone || '').trim(),
    createdAt: serverTimestamp(),
  });
}

export function deleteReferrer(id) {
  if (!isFirebaseEnabled) {
    let referrers = getLocalReferrers();
    referrers = referrers.filter((r) => r.id !== id);
    setLocalReferrers(referrers);
    notifyLocalListeners();
    return Promise.resolve();
  }
  return remove(ref(db, `${ROOT}/${id}`));
}
