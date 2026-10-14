import { describe, it, expect, vi, beforeEach } from 'vitest';

// Covers the Firebase branch of services/orders.js. database.rules.json lets only
// admins list /orders, so customer-facing code must never read the collection:
// these tests fail if a customer path calls get/onValue on the `orders` root.
const calls = { refs: [], sets: [], gets: [], listeners: {} };
const fakeOrders = {};

vi.mock('../firebase.js', () => ({ isFirebaseEnabled: true, db: {} }));
vi.mock('firebase/database', () => ({
  ref: (_db, path = '') => {
    calls.refs.push(path);
    return { path };
  },
  child: (parent, path) => ({ path: `${parent.path}${path}` }),
  set: (r, value) => {
    calls.sets.push({ path: r.path, value });
    return Promise.resolve();
  },
  get: (r) => {
    calls.gets.push(r.path);
    const id = r.path.replace(/^orders\//, '');
    if (r.path === 'orders') return Promise.reject(new Error('PERMISSION_DENIED'));
    const value = fakeOrders[id];
    return Promise.resolve({ exists: () => value !== undefined, val: () => value });
  },
  onValue: (r, onNext, onError) => {
    calls.listeners[r.path] = true;
    if (r.path === 'orders') {
      onError(new Error('PERMISSION_DENIED'));
      return () => {};
    }
    const value = fakeOrders[r.path.replace(/^orders\//, '')];
    onNext({ exists: () => value !== undefined, val: () => value });
    return () => {};
  },
}));

if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.clear !== 'function') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

const { rememberOrderId, readRememberedOrderIds, subscribeToMyOrders, hasPriorOrders, setOrderShipment } =
  await import('./orders.js');

const user = { uid: 'u1', phoneNumber: '+919876543210' };
const mine = (id, placedAt, extra = {}) => ({
  id,
  placedAt,
  status: 'Processing',
  shippingDetails: { phone: '9876543210', firstName: 'Asha' },
  ...extra,
});

beforeEach(() => {
  localStorage.clear();
  calls.refs.length = 0;
  calls.sets.length = 0;
  calls.gets.length = 0;
  calls.listeners = {};
  for (const key of Object.keys(fakeOrders)) delete fakeOrders[key];
});

describe('remembered order ids', () => {
  it('stores ids once, newest last, capped at 50', () => {
    for (let i = 0; i < 60; i += 1) rememberOrderId(`ORD-${i}`);
    rememberOrderId('ORD-55');
    const ids = readRememberedOrderIds();
    expect(ids).toHaveLength(50);
    expect(ids.at(-1)).toBe('ORD-55');
    expect(ids.filter((id) => id === 'ORD-55')).toHaveLength(1);
  });

  it('ignores corrupt storage', () => {
    localStorage.setItem('a2z_my_order_ids', '{not json');
    expect(readRememberedOrderIds()).toEqual([]);
    localStorage.setItem('a2z_my_order_ids', '{"a":1}');
    expect(readRememberedOrderIds()).toEqual([]);
  });
});

describe('subscribeToMyOrders (Firebase)', () => {
  it('looks up remembered ids one by one, never the orders collection, newest first, only the user\'s', () => {
    fakeOrders['ORD-A'] = mine('ORD-A', '2026-01-01T00:00:00Z');
    fakeOrders['ORD-B'] = mine('ORD-B', '2026-02-01T00:00:00Z');
    fakeOrders['ORD-C'] = { ...mine('ORD-C', '2026-03-01T00:00:00Z'), shippingDetails: { phone: '9000000000', firstName: 'Other' } };
    ['ORD-A', 'ORD-B', 'ORD-C'].forEach(rememberOrderId);

    const cb = vi.fn();
    subscribeToMyOrders(user, cb);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].map((o) => o.id)).toEqual(['ORD-B', 'ORD-A']);
    expect(Object.keys(calls.listeners).sort()).toEqual(['orders/ORD-A', 'orders/ORD-B', 'orders/ORD-C']);
    expect(calls.listeners.orders).toBeUndefined();
  });

  it('returns an empty list without touching the database when nothing is remembered', () => {
    const cb = vi.fn();
    subscribeToMyOrders(user, cb);
    expect(cb).toHaveBeenCalledWith([]);
    expect(calls.listeners).toEqual({});
  });

  it('drops remembered ids whose order no longer exists', () => {
    fakeOrders['ORD-A'] = mine('ORD-A', '2026-01-01T00:00:00Z');
    ['ORD-A', 'ORD-GONE'].forEach(rememberOrderId);
    const cb = vi.fn();
    subscribeToMyOrders(user, cb);
    expect(cb.mock.calls.at(-1)[0].map((o) => o.id)).toEqual(['ORD-A']);
  });
});

describe('hasPriorOrders (Firebase)', () => {
  it('is true when a remembered, non-cancelled order matches the user, without reading the collection', async () => {
    fakeOrders['ORD-A'] = mine('ORD-A', '2026-01-01T00:00:00Z');
    rememberOrderId('ORD-A');
    await expect(hasPriorOrders(user)).resolves.toBe(true);
    expect(calls.gets).not.toContain('orders');
  });

  it('ignores cancelled orders and orders belonging to someone else', async () => {
    fakeOrders['ORD-A'] = mine('ORD-A', '2026-01-01T00:00:00Z', { status: 'Cancelled' });
    fakeOrders['ORD-C'] = { ...mine('ORD-C', '2026-03-01T00:00:00Z'), shippingDetails: { phone: '9000000000', firstName: 'Other' } };
    ['ORD-A', 'ORD-C'].forEach(rememberOrderId);
    await expect(hasPriorOrders(user)).resolves.toBe(false);
  });

  it('is false with no remembered orders or no user', async () => {
    await expect(hasPriorOrders(user)).resolves.toBe(false);
    await expect(hasPriorOrders(null)).resolves.toBe(false);
  });
});

describe('setOrderShipment (Firebase)', () => {
  it('writes only the shipment child, with undefined values dropped', async () => {
    await setOrderShipment('ORD-A', { status: 'created', awb: 'AWB1', labelUrl: undefined });
    expect(calls.sets).toEqual([{ path: 'orders/ORD-A/shipment', value: { status: 'created', awb: 'AWB1' } }]);
  });
});
