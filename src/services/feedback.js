import { onValue, push, ref, serverTimestamp } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const ROOT = 'feedback';

function getLocalFeedback() {
  try {
    const data = localStorage.getItem(ROOT);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalFeedback(entries) {
  localStorage.setItem(ROOT, JSON.stringify(entries));
}

export function createFeedback({ name, email, rating, message }) {
  const payload = {
    name: name.trim(),
    email: email.trim(),
    rating: rating || null,
    message: message.trim(),
  };

  if (!isFirebaseEnabled) {
    const entries = getLocalFeedback();
    entries.push({ id: `feedback_${Date.now()}`, ...payload, createdAt: Date.now() });
    setLocalFeedback(entries);
    return Promise.resolve();
  }

  return push(ref(db, ROOT), { ...payload, createdAt: serverTimestamp() });
}

// Admin-only: the database rules restrict reads on this node to authenticated users.
export function subscribeToFeedback(callback) {
  if (!isFirebaseEnabled) {
    const entries = getLocalFeedback();
    entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(entries, null);
    return () => {};
  }
  return onValue(
    ref(db, ROOT),
    (snapshot) => {
      const rows = [];
      snapshot.forEach((child) => {
        rows.push({ id: child.key, ...child.val() });
      });
      rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(rows, null);
    },
    (error) => callback([], error)
  );
}
