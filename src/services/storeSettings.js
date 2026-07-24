import { get, onValue, ref, set } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';
import { FACEBOOK_URL } from '../config/store.js';

const PATH = 'settings/store';

export const DEFAULT_STORE_SETTINGS = {
  storeName: '',
  location: '',
  address: '',
  phone: '',
  gstNumber: '',
  facebookUrl: FACEBOOK_URL,
  // Structured warehouse address used as the pickupAddress for shipping
  // (ShipPrime etc.) — the free-text `address`/`location` fields above
  // aren't reliably parseable into courier-required fields.
  pickupAddress: {
    name: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  },
};

function getLocalStoreSettings() {
  try {
    const data = localStorage.getItem(PATH);
    return data ? JSON.parse(data) : DEFAULT_STORE_SETTINGS;
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
}

function setLocalStoreSettings(data) {
  localStorage.setItem(PATH, JSON.stringify(data));
}

const settingsListeners = new Set();
function notifySettingsListeners() {
  const data = getLocalStoreSettings();
  settingsListeners.forEach((listener) => listener(data, null));
}

export function subscribeToStoreSettings(callback) {
  if (!isFirebaseEnabled) {
    settingsListeners.add(callback);
    callback(getLocalStoreSettings(), null);
    return () => {
      settingsListeners.delete(callback);
    };
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
  if (!isFirebaseEnabled) {
    setLocalStoreSettings(data);
    notifySettingsListeners();
    return Promise.resolve();
  }
  return set(ref(db, PATH), { ...data, updatedAt: Date.now() });
}

export async function getStoreSettingsOnce() {
  if (!isFirebaseEnabled) return getLocalStoreSettings();
  const snapshot = await get(ref(db, PATH));
  return snapshot.exists() ? { ...DEFAULT_STORE_SETTINGS, ...snapshot.val() } : DEFAULT_STORE_SETTINGS;
}
