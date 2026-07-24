import { get, onValue, ref, set } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';
import { FACEBOOK_URL } from '../config/store.js';

const PATH = 'settings/store';

export const DEFAULT_REFUND_POLICY = `No Returns & No Exchanges Policy
Our policy is that we sell quality products and we believe in no returns and no exchanges. There are strictly no returns or exchanges accepted under any circumstances — even if you receive a faulty or defective product, there is no exchange for that.

No Order Cancellation
First of all, there is no provision for cancellation to the order once it has been placed.

Delivery & Courier Reattempts
If at all, by any chance you are missing the delivery, there would be reattempts made by the courier partner. If in case you are unable to receive that courier, you can take it to your neighbor's house or somebody who is near you.

Returned Parcels & Resend Charges
If at all you fail to get the delivery done, the parcel will be returned to A to Z collection. You can request for a resend. We will resend you the parcel, but the charges for that will be borne by you. A to Z is not liable for you not receiving the order.

Non-Refundable Policy
If in case you still fail to receive the order, the money won't be returned because there is no returns or exchange policy.`;

export const DEFAULT_STORE_SETTINGS = {
  storeName: '',
  location: '',
  address: '',
  phone: '',
  gstNumber: '',
  facebookUrl: FACEBOOK_URL,
  refundPolicy: DEFAULT_REFUND_POLICY,
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
    return data ? { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(data) } : DEFAULT_STORE_SETTINGS;
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
