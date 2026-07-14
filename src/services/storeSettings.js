import { get, onValue, ref, set } from 'firebase/database';
import { db } from '../firebase.js';

const PATH = 'settings/store';

export const DEFAULT_STORE_SETTINGS = {
  storeName: '',
  location: '',
  address: '',
  phone: '',
  gstNumber: '',
};

export function subscribeToStoreSettings(callback) {
  return onValue(
    ref(db, PATH),
    (snapshot) => {
      callback(snapshot.exists() ? { ...DEFAULT_STORE_SETTINGS, ...snapshot.val() } : DEFAULT_STORE_SETTINGS, null);
    },
    (error) => callback(DEFAULT_STORE_SETTINGS, error)
  );
}

export function saveStoreSettings(data) {
  return set(ref(db, PATH), { ...data, updatedAt: Date.now() });
}

export async function getStoreSettingsOnce() {
  const snapshot = await get(ref(db, PATH));
  return snapshot.exists() ? { ...DEFAULT_STORE_SETTINGS, ...snapshot.val() } : DEFAULT_STORE_SETTINGS;
}
