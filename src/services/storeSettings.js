import { get, onValue, ref, set } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const PATH = 'settings/store';
const DISABLED_ERROR = new Error('Realtime Database is not configured yet. Add Firebase credentials to .env.');

export const DEFAULT_STORE_SETTINGS = {
  storeName: '',
  location: '',
  address: '',
  phone: '',
  gstNumber: '',
};

export function subscribeToStoreSettings(callback) {
  if (!isFirebaseEnabled) {
    callback(DEFAULT_STORE_SETTINGS, DISABLED_ERROR);
    return () => {};
  }
  return onValue(
    ref(db, PATH),
    (snapshot) => {
      callback(snapshot.exists() ? { ...DEFAULT_STORE_SETTINGS, ...snapshot.val() } : DEFAULT_STORE_SETTINGS, null);
    },
    (error) => callback(DEFAULT_STORE_SETTINGS, error)
  );
}

export function saveStoreSettings(data) {
  if (!isFirebaseEnabled) return Promise.reject(DISABLED_ERROR);
  return set(ref(db, PATH), { ...data, updatedAt: Date.now() });
}

export async function getStoreSettingsOnce() {
  if (!isFirebaseEnabled) return DEFAULT_STORE_SETTINGS;
  const snapshot = await get(ref(db, PATH));
  return snapshot.exists() ? { ...DEFAULT_STORE_SETTINGS, ...snapshot.val() } : DEFAULT_STORE_SETTINGS;
}
