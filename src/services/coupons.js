import { onValue, ref, remove, runTransaction, serverTimestamp, set, get } from 'firebase/database';
import { db, isFirebaseEnabled } from '../firebase.js';
import { normalizeCouponCode, reserveCouponUsageOnData, releaseCouponUsageOnData } from '../utils/coupons.js';

const ROOT = 'coupons';

function getLocalCoupons() {
  try {
    const data = localStorage.getItem(ROOT);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalCoupons(coupons) {
  localStorage.setItem(ROOT, JSON.stringify(coupons));
}

const localListeners = new Set();
function notifyLocalListeners() {
  const coupons = getLocalCoupons();
  coupons.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
  localListeners.forEach((listener) => listener(coupons, null));
}

function couponError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

export function subscribeToCoupons(callback) {
  if (!isFirebaseEnabled) {
    localListeners.add(callback);
    const coupons = getLocalCoupons();
    coupons.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
    callback(coupons, null);
    return () => localListeners.delete(callback);
  }
  return onValue(
    ref(db, ROOT),
    (snapshot) => {
      const rows = [];
      snapshot.forEach((child) => rows.push(child.val()));
      rows.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
      callback(rows, null);
    },
    (error) => callback([], error)
  );
}

// One-time lookup for "Apply coupon" on the cart — read-only, doesn't touch
// usageCount. Returns null (not a rejected promise) when the code doesn't
// exist, since "not found" is a normal outcome here, not a failure.
export function getCouponByCode(code) {
  const normalized = normalizeCouponCode(code);
  if (!isFirebaseEnabled) {
    const coupon = getLocalCoupons().find((c) => c.code === normalized) || null;
    return Promise.resolve(coupon);
  }
  return get(ref(db, `${ROOT}/${normalized}`)).then((snapshot) => (snapshot.exists() ? snapshot.val() : null));
}

export function createCoupon(input) {
  const code = normalizeCouponCode(input.code);
  const payload = {
    ...input,
    code,
    usageCount: 0,
    customerUsage: {},
    createdAtMs: Date.now(),
    updatedAtMs: Date.now(),
  };

  if (!isFirebaseEnabled) {
    const coupons = getLocalCoupons();
    if (coupons.some((c) => c.code === code)) {
      return Promise.reject(couponError('COUPON_CODE_TAKEN', `A coupon with code "${code}" already exists.`));
    }
    coupons.push(payload);
    setLocalCoupons(coupons);
    notifyLocalListeners();
    return Promise.resolve(payload);
  }

  const couponRef = ref(db, `${ROOT}/${code}`);
  return get(couponRef).then((snapshot) => {
    if (snapshot.exists()) {
      return Promise.reject(couponError('COUPON_CODE_TAKEN', `A coupon with code "${code}" already exists.`));
    }
    return set(couponRef, { ...payload, createdAt: serverTimestamp() }).then(() => payload);
  });
}

// Preserves usageCount/customerUsage — editing a coupon's rules must never
// reset how much of it has already been redeemed.
export function updateCoupon(code, input) {
  const normalized = normalizeCouponCode(code);

  if (!isFirebaseEnabled) {
    const coupons = getLocalCoupons();
    const idx = coupons.findIndex((c) => c.code === normalized);
    if (idx === -1) return Promise.reject(couponError('COUPON_NOT_FOUND', 'Coupon not found.'));
    const updated = { ...coupons[idx], ...input, code: normalized, updatedAtMs: Date.now() };
    coupons[idx] = updated;
    setLocalCoupons(coupons);
    notifyLocalListeners();
    return Promise.resolve(updated);
  }

  const couponRef = ref(db, `${ROOT}/${normalized}`);
  return get(couponRef).then((snapshot) => {
    if (!snapshot.exists()) return Promise.reject(couponError('COUPON_NOT_FOUND', 'Coupon not found.'));
    const updated = { ...snapshot.val(), ...input, code: normalized, updatedAt: serverTimestamp(), updatedAtMs: Date.now() };
    return set(couponRef, updated).then(() => updated);
  });
}

export function deleteCoupon(code) {
  const normalized = normalizeCouponCode(code);
  if (!isFirebaseEnabled) {
    setLocalCoupons(getLocalCoupons().filter((c) => c.code !== normalized));
    notifyLocalListeners();
    return Promise.resolve();
  }
  return remove(ref(db, `${ROOT}/${normalized}`));
}

// Firebase has no Cloud Functions here to supply real server time, but
// `.info/serverTimeOffset` is a documented client SDK feature that reports
// the clock skew between this device and the Firebase server — applying it
// gives an authoritative "now" without trusting the browser's own clock.
export function getServerNow() {
  if (!isFirebaseEnabled) return Promise.resolve(new Date());
  return get(ref(db, '.info/serverTimeOffset')).then((snapshot) => new Date(Date.now() + (snapshot.val() || 0)));
}

// Atomically consumes one use of a coupon: increments usageCount and the
// per-customer counter in a single compare-and-swap, rejecting with a
// COUPON_* error code if any gate (disabled/expired/not-started/usage
// limit/per-customer limit) fails on the value actually committed in the
// database — never on a possibly-stale read taken earlier. This is the only
// place usage is consumed; call releaseCouponUsage to undo it if the order
// that triggered this reservation doesn't end up completing.
export function reserveCouponUsage(code, customerId, now = new Date()) {
  const normalized = normalizeCouponCode(code);

  if (!isFirebaseEnabled) {
    const coupons = getLocalCoupons();
    const idx = coupons.findIndex((c) => c.code === normalized);
    const result = reserveCouponUsageOnData(idx === -1 ? null : coupons[idx], { customerId, now });
    if (!result.ok) return Promise.reject(couponError(result.code, result.message));
    coupons[idx] = result.coupon;
    setLocalCoupons(coupons);
    notifyLocalListeners();
    return Promise.resolve(result.coupon);
  }

  const couponRef = ref(db, `${ROOT}/${normalized}`);
  let lastFailure = null;
  return runTransaction(couponRef, (coupon) => {
    const result = reserveCouponUsageOnData(coupon, { customerId, now });
    if (!result.ok) {
      lastFailure = result;
      return undefined; // abort the transaction — no write happens
    }
    lastFailure = null;
    return result.coupon;
  }).then((txResult) => {
    if (!txResult.committed) {
      throw couponError(lastFailure?.code || 'COUPON_UNAVAILABLE', lastFailure?.message || 'Coupon could not be applied.');
    }
    return txResult.snapshot.val();
  });
}

// Compensating action for reserveCouponUsage — gives back the usage slot
// when the order it was reserved for fails after the coupon was consumed
// (out of stock, order-creation error). Always succeeds; there is nothing to
// validate when releasing.
export function releaseCouponUsage(code, customerId) {
  const normalized = normalizeCouponCode(code);

  if (!isFirebaseEnabled) {
    const coupons = getLocalCoupons();
    const idx = coupons.findIndex((c) => c.code === normalized);
    if (idx === -1) return Promise.resolve();
    coupons[idx] = releaseCouponUsageOnData(coupons[idx], { customerId });
    setLocalCoupons(coupons);
    notifyLocalListeners();
    return Promise.resolve();
  }

  const couponRef = ref(db, `${ROOT}/${normalized}`);
  return runTransaction(couponRef, (coupon) => releaseCouponUsageOnData(coupon, { customerId })).then(() => {});
}
