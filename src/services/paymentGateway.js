import { get, onValue, ref, set, remove } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';

const PATH = 'settings/payment_gateways';

export function subscribeToPaymentGateways(callback) {
  if (!isFirebaseEnabled) {
    console.warn("Firebase not enabled. Payment gateways cannot be fetched/saved.");
    callback([], null);
    return () => {};
  }
  return onValue(
    ref(db, PATH),
    (snapshot) => {
      const gateways = [];
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          gateways.push({ id: child.key, ...child.val() });
        });
      }
      callback(gateways, null);
    },
    (error) => callback([], error)
  );
}

export function savePaymentGateway(gateway) {
  if (!isFirebaseEnabled) {
    return Promise.reject(new Error("Firebase is not enabled. Cannot save payment gateway config."));
  }
  const id = gateway.id || gateway.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return set(ref(db, `${PATH}/${id}`), {
    name: gateway.name,
    apiKey: gateway.apiKey,
    apiSecret: gateway.apiSecret || '',
    isActive: gateway.isActive ?? false,
    updatedAt: Date.now(),
  });
}

export function deletePaymentGateway(id) {
  if (!isFirebaseEnabled) {
    return Promise.reject(new Error("Firebase is not enabled. Cannot delete payment gateway config."));
  }
  return remove(ref(db, `${PATH}/${id}`));
}

export async function getActivePaymentGateway() {
  if (!isFirebaseEnabled) return null;
  const snapshot = await get(ref(db, PATH));
  if (snapshot.exists()) {
    let active = null;
    snapshot.forEach((child) => {
      const data = child.val();
      if (data.isActive) {
        active = { id: child.key, ...data };
      }
    });
    return active;
  }
  return null;
}
