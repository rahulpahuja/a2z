// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyIdToken = vi.fn();
let data;
const get = vi.fn();
vi.mock('firebase-admin/app', () => ({
  cert: (x) => x,
  getApps: () => [{ options: { credential: { getAccessToken: async () => ({ access_token: 'at' }) } } }],
  initializeApp: () => {},
}));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken }) }));
vi.mock('firebase-admin/database', () => ({
  getDatabase: () => ({ ref: (key) => ({ get: async () => { get(key); return { val: () => data[key] ?? null }; } }) }),
}));

const { handler, measureDatabase, jsonBytes, STORAGE_LIMIT_BYTES } = await import('../functions/db-usage.js');

const call = (token, query) => handler({ httpMethod: 'GET', headers: token ? { authorization: `Bearer ${token}` } : {}, queryStringParameters: query });

beforeEach(() => {
  process.env.FIREBASE_SERVICE_ACCOUNT = '{}';
  process.env.VITE_FIREBASE_DATABASE_URL = 'https://example-default-rtdb.firebaseio.com/';
  data = { products: { a: { name: 'x'.repeat(100) } }, orders: { o1: { total: 5 } }, empty: null };
  global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ products: true, orders: true, empty: true }) }));
  verifyIdToken.mockReset();
  get.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('measureDatabase', () => {
  it('adds up each top-level node (keys included), largest first, and counts a missing node as 0', async () => {
    const result = await measureDatabase({ listKeys: async () => ['small', 'big', 'gone'], readNode: async (k) => ({ small: { a: 1 }, big: { a: 'y'.repeat(50) }, gone: null })[k] });
    expect(result.nodes.map((n) => n.name)).toEqual(['big', 'small', 'gone']);
    expect(result.nodes[0].bytes).toBe(jsonBytes({ a: 'y'.repeat(50) }) + 3);
    expect(result.nodes[2].bytes).toBe(0);
    expect(result.totalBytes).toBe(result.nodes.reduce((s, n) => s + n.bytes, 0));
    expect(result.limitBytes).toBe(STORAGE_LIMIT_BYTES);
    expect(result.partial).toBe(false);
  });

  it('counts multi-byte characters as bytes, not characters', () => {
    expect(jsonBytes('₹')).toBe(5); // 3 bytes for the symbol plus the two quotes
  });

  it('stops starting reads after the deadline and reports what it skipped', async () => {
    let clock = 0;
    const readNode = vi.fn(async () => { clock += 100; return { v: 1 }; });
    const result = await measureDatabase({ listKeys: async () => ['a', 'b', 'c'], readNode, now: () => clock, deadlineMs: 150, concurrency: 1 });
    expect(readNode).toHaveBeenCalledTimes(2);
    expect(result.partial).toBe(true);
    expect(result.skipped).toEqual(['c']);
  });
});

describe('db-usage handler', () => {
  it('rejects non-GET, missing, invalid and non-admin callers without reading the database', async () => {
    expect((await handler({ httpMethod: 'POST', headers: {} })).statusCode).toBe(405);
    expect((await call(null)).statusCode).toBe(401);
    verifyIdToken.mockRejectedValueOnce(new Error('bad'));
    expect((await call('bad')).statusCode).toBe(401);
    verifyIdToken.mockResolvedValueOnce({ uid: 'c_1', customer: true });
    expect((await call('customer')).statusCode).toBe(403);
    expect(get).not.toHaveBeenCalled();
  });

  it('measures for an admin, then serves the cached figure until a refresh is asked for', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'msg91:1', admin: true });
    const first = await call('good');
    expect(first.statusCode).toBe(200);
    const body = JSON.parse(first.body);
    expect(body.cached).toBe(false);
    expect(body.nodes.map((n) => n.name)).toEqual(['products', 'orders', 'empty']);
    expect(body.totalBytes).toBeGreaterThan(100);
    expect(global.fetch.mock.calls[0][0]).toBe('https://example-default-rtdb.firebaseio.com/.json?shallow=true');

    const reads = get.mock.calls.length;
    expect(JSON.parse((await call('good')).body).cached).toBe(true);
    expect(get).toHaveBeenCalledTimes(reads);
    expect(JSON.parse((await call('good', { refresh: '1' })).body).cached).toBe(false);
    expect(get.mock.calls.length).toBeGreaterThan(reads);
  });
});
