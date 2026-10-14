import { describe, it, expect, vi, beforeEach } from 'vitest';

// Covers reserveProductStock / releaseProductStock. database.rules.json lets a
// customer (no admin claim) write only the numeric leaf
// adminProducts/$id/colors/$ci/sizes/$si/stock, so the Firebase branch must
// never write the colors array or anything else: these tests fail if it does.
const flag = vi.hoisted(() => ({ firebase: true }));
const state = { tree: {}, gets: [], writes: [] };

const segments = (path) => path.split('/').filter(Boolean);
const readAt = (path) => segments(path).reduce((node, key) => (node == null ? node : node[key]), state.tree);
const writeAt = (path, value) => {
  const keys = segments(path);
  const last = keys.pop();
  const parent = keys.reduce((node, key) => node[key], state.tree);
  parent[last] = value;
};

vi.mock('../firebase.js', () => ({
  get isFirebaseEnabled() {
    return flag.firebase;
  },
  db: {},
}));
vi.mock('firebase/database', () => ({
  ref: (_db, path = '') => ({ path }),
  get: (r) => {
    state.gets.push(r.path);
    const value = readAt(r.path);
    return Promise.resolve({ exists: () => value != null, val: () => value });
  },
  runTransaction: (r, update) => {
    const next = update(readAt(r.path) ?? null);
    if (next === undefined) return Promise.resolve({ committed: false });
    state.writes.push({ path: r.path, value: next });
    writeAt(r.path, next);
    return Promise.resolve({ committed: true });
  },
  set: (r, value) => {
    state.writes.push({ path: r.path, value });
    return Promise.resolve();
  },
  update: vi.fn(),
  remove: vi.fn(),
  onValue: vi.fn(),
  serverTimestamp: vi.fn(),
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

const { reserveProductStock, releaseProductStock, MAX_STOCK_DELTA } = await import('./adminProducts.js');

const product = () => ({
  id: 'p1',
  title: 'Kurta',
  price: 999,
  colors: [
    { name: 'Red', hex: '#f00', sizes: [{ size: 'S', stock: 10 }, { size: 'M', stock: 3 }, { size: 'XL' }, { size: 'XXL', stock: null }] },
    { name: 'Blue', hex: '#00f', sizes: [{ size: 'S', stock: 4 }] },
    'Legacy Green',
    { name: 'NoSizes', hex: '#000' },
  ],
});
const leaf = (ci, si) => `adminProducts/p1/colors/${ci}/sizes/${si}/stock`;

beforeEach(() => {
  flag.firebase = true;
  state.tree = { adminProducts: { p1: product() } };
  state.gets = [];
  state.writes = [];
  localStorage.clear();
});

describe('reserveProductStock (Firebase)', () => {
  it('decrements only the stock leaf and reports success', async () => {
    await expect(reserveProductStock('p1', 'Red', 'S', 3)).resolves.toBe(true);
    expect(state.writes).toEqual([{ path: leaf(0, 0), value: 7 }]);
    expect(state.tree.adminProducts.p1.colors[0].sizes[0].stock).toBe(7);
  });

  it('resolves the right colour index and size index by name', async () => {
    await expect(reserveProductStock('p1', 'Blue', 'S', 1)).resolves.toBe(true);
    expect(state.writes).toEqual([{ path: leaf(1, 0), value: 3 }]);
  });

  it('allows taking stock exactly to zero', async () => {
    await expect(reserveProductStock('p1', 'Red', 'M', 3)).resolves.toBe(true);
    expect(state.tree.adminProducts.p1.colors[0].sizes[1].stock).toBe(0);
  });

  it('returns false and changes nothing when stock is insufficient', async () => {
    await expect(reserveProductStock('p1', 'Red', 'M', 4)).resolves.toBe(false);
    expect(state.writes).toEqual([]);
    expect(state.tree.adminProducts.p1.colors[0].sizes[1].stock).toBe(3);
  });

  it('returns false for an out-of-stock size', async () => {
    state.tree.adminProducts.p1.colors[0].sizes[1].stock = 0;
    await expect(reserveProductStock('p1', 'Red', 'M', 1)).resolves.toBe(false);
  });

  it('refuses a reservation larger than the rules allow per write, without touching the database', async () => {
    state.tree.adminProducts.p1.colors[0].sizes[0].stock = 500;
    await expect(reserveProductStock('p1', 'Red', 'S', MAX_STOCK_DELTA + 1)).resolves.toBe(false);
    expect(state.gets).toEqual([]);
    expect(state.writes).toEqual([]);
  });

  it('accepts a reservation of exactly the per-write bound', async () => {
    state.tree.adminProducts.p1.colors[0].sizes[0].stock = 500;
    await expect(reserveProductStock('p1', 'Red', 'S', MAX_STOCK_DELTA)).resolves.toBe(true);
    expect(state.tree.adminProducts.p1.colors[0].sizes[0].stock).toBe(500 - MAX_STOCK_DELTA);
  });

  it.each([
    ['untracked size (no stock key)', 'Red', 'XL'],
    ['untracked size (stock null)', 'Red', 'XXL'],
    ['unknown size', 'Red', 'XXXL'],
    ['unknown colour', 'Purple', 'S'],
    ['legacy string colour', 'Legacy Green', 'S'],
    ['colour without sizes', 'NoSizes', 'S'],
  ])('allows %s without writing anything', async (_label, color, size) => {
    await expect(reserveProductStock('p1', color, size, 2)).resolves.toBe(true);
    expect(state.writes).toEqual([]);
  });

  it('allows a product that has no colours or does not exist', async () => {
    delete state.tree.adminProducts.p1.colors;
    await expect(reserveProductStock('p1', 'Red', 'S', 1)).resolves.toBe(true);
    await expect(reserveProductStock('missing', 'Red', 'S', 1)).resolves.toBe(true);
    expect(state.writes).toEqual([]);
  });

  it('treats a non-numeric stored stock as untracked', async () => {
    state.tree.adminProducts.p1.colors[0].sizes[0].stock = '10';
    await expect(reserveProductStock('p1', 'Red', 'S', 1)).resolves.toBe(true);
    expect(state.writes).toEqual([]);
  });

  it('handles colours/sizes that the database returns as keyed objects instead of arrays', async () => {
    state.tree.adminProducts.p1.colors = { 0: { name: 'Red', sizes: { 0: { size: 'S', stock: 2 }, 2: { size: 'L', stock: 5 } } } };
    await expect(reserveProductStock('p1', 'Red', 'L', 5)).resolves.toBe(true);
    expect(state.writes).toEqual([{ path: leaf(0, 2), value: 0 }]);
  });

  it('never writes anything but a numeric stock leaf', async () => {
    await reserveProductStock('p1', 'Red', 'S', 2);
    await releaseProductStock('p1', 'Blue', 'S', 2);
    for (const { path, value } of state.writes) {
      expect(path).toMatch(/^adminProducts\/p1\/colors\/\d+\/sizes\/\d+\/stock$/);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('only lets exactly one of several racing reservations take the last unit', async () => {
    state.tree.adminProducts.p1.colors[0].sizes[1].stock = 1;
    const results = await Promise.all([1, 2, 3].map(() => reserveProductStock('p1', 'Red', 'M', 1)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(state.tree.adminProducts.p1.colors[0].sizes[1].stock).toBe(0);
  });

  it('rejects non-integer or zero quantities safely', async () => {
    await expect(reserveProductStock('p1', 'Red', 'S', 1.5)).resolves.toBe(false);
    await expect(reserveProductStock('p1', 'Red', 'S', Number.NaN)).resolves.toBe(false);
    await expect(reserveProductStock('p1', 'Red', 'S', 0)).resolves.toBe(true);
    expect(state.writes).toEqual([]);
  });
});

describe('releaseProductStock (Firebase)', () => {
  it('gives back a reservation (rollback round trip)', async () => {
    await reserveProductStock('p1', 'Red', 'S', 4);
    await releaseProductStock('p1', 'Red', 'S', 4);
    expect(state.tree.adminProducts.p1.colors[0].sizes[0].stock).toBe(10);
  });

  it('resolves to undefined and ignores untracked sizes', async () => {
    await expect(releaseProductStock('p1', 'Red', 'XL', 2)).resolves.toBeUndefined();
    await expect(releaseProductStock('p1', 'Legacy Green', 'S', 2)).resolves.toBeUndefined();
    expect(state.writes).toEqual([]);
  });

  it('splits a release larger than the per-write bound into allowed chunks', async () => {
    const quantity = MAX_STOCK_DELTA * 2 + 5;
    await releaseProductStock('p1', 'Red', 'S', quantity);
    expect(state.writes).toHaveLength(3);
    expect(state.tree.adminProducts.p1.colors[0].sizes[0].stock).toBe(10 + quantity);
    for (let i = 1; i < state.writes.length; i += 1) {
      expect(state.writes[i].value - state.writes[i - 1].value).toBeLessThanOrEqual(MAX_STOCK_DELTA);
    }
  });
});

describe('reserve/release without Firebase (local simulation)', () => {
  beforeEach(() => {
    flag.firebase = false;
    localStorage.setItem('adminProducts', JSON.stringify([product()]));
  });
  const stored = () => JSON.parse(localStorage.getItem('adminProducts'))[0].colors;

  it('keeps the previous local behaviour: reserve, out of stock, release', async () => {
    await expect(reserveProductStock('p1', 'Red', 'M', 2)).resolves.toBe(true);
    expect(stored()[0].sizes[1].stock).toBe(1);
    await expect(reserveProductStock('p1', 'Red', 'M', 2)).resolves.toBe(false);
    expect(stored()[0].sizes[1].stock).toBe(1);
    await releaseProductStock('p1', 'Red', 'M', 2);
    expect(stored()[0].sizes[1].stock).toBe(3);
    expect(state.gets).toEqual([]);
    expect(state.writes).toEqual([]);
  });

  it('allows untracked sizes and legacy string colours', async () => {
    await expect(reserveProductStock('p1', 'Red', 'XL', 9)).resolves.toBe(true);
    await expect(reserveProductStock('p1', 'Legacy Green', 'S', 9)).resolves.toBe(true);
  });
});
