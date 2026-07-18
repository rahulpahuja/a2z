import { get, onValue, ref, set } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const PATH = 'settings/tracking_partners';

export const DEFAULT_TRACKING_PARTNERS = [
  'DHL',
  'FedEx',
  'BlueDart',
  'Delhivery',
  'DTDC',
  'India Post'
];

function getLocalTrackingPartners() {
  try {
    const data = localStorage.getItem(PATH);
    return data ? JSON.parse(data) : DEFAULT_TRACKING_PARTNERS;
  } catch {
    return DEFAULT_TRACKING_PARTNERS;
  }
}

function setLocalTrackingPartners(data) {
  localStorage.setItem(PATH, JSON.stringify(data));
}

const listeners = new Set();
function notifyListeners() {
  const data = getLocalTrackingPartners();
  listeners.forEach((listener) => listener(data, null));
}

export function subscribeToTrackingPartners(callback) {
  if (!isFirebaseEnabled) {
    listeners.add(callback);
    callback(getLocalTrackingPartners(), null);
    return () => {
      listeners.delete(callback);
    };
  }
  return onValue(
    ref(db, PATH),
    (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : DEFAULT_TRACKING_PARTNERS, null);
    },
    (error) => callback(DEFAULT_TRACKING_PARTNERS, error)
  );
}

export function saveTrackingPartners(data) {
  if (!isFirebaseEnabled) {
    setLocalTrackingPartners(data);
    notifyListeners();
    return Promise.resolve();
  }
  return set(ref(db, PATH), data);
}

export async function getTrackingPartnersOnce() {
  if (!isFirebaseEnabled) return getLocalTrackingPartners();
  const snapshot = await get(ref(db, PATH));
  return snapshot.exists() ? snapshot.val() : DEFAULT_TRACKING_PARTNERS;
}
