import { describe, it, expect, vi, beforeEach } from 'vitest';

// Firebase branch: the transaction callback is what enforces optimistic concurrency, so
// drive it directly with different "current" values.
const runTransaction = vi.fn();
vi.mock('../firebase.js', () => ({ isFirebaseEnabled: true, db: {} }));
vi.mock('firebase/database', () => ({
  ref: (_db, path) => ({ path }),
  onValue: vi.fn(),
  runTransaction: (...args) => runTransaction(...args),
}));

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

const { saveHomeLayout, HomeLayoutConflictError } = await import('./homeLayout.js');
const { createDefaultHomeLayout } = await import('../utils/homeLayout.js');

// Simulates Firebase: runs the update function against `current` and reports the result.
function mockServer(current) {
  runTransaction.mockImplementation(async (_ref, update) => {
    const next = update(current);
    return { committed: next !== undefined, snapshot: { val: () => next } };
  });
}

beforeEach(() => {
  runTransaction.mockReset();
  localStorage.clear();
});

describe('saveHomeLayout (Firebase)', () => {
  it('writes revision + 1 when the stored revision matches', async () => {
    mockServer({ ...createDefaultHomeLayout(), rev: 4 });
    const saved = await saveHomeLayout(createDefaultHomeLayout(), 4);
    expect(saved.rev).toBe(5);
    expect(saved.updatedAt).toBeGreaterThan(0);
  });

  it('aborts with a conflict when someone else saved first', async () => {
    mockServer({ ...createDefaultHomeLayout(), rev: 6 });
    await expect(saveHomeLayout(createDefaultHomeLayout(), 4)).rejects.toBeInstanceOf(HomeLayoutConflictError);
  });

  it('accepts the first save on an empty node', async () => {
    mockServer(null);
    const saved = await saveHomeLayout(createDefaultHomeLayout(), 0);
    expect(saved.rev).toBe(1);
  });

  it('treats a stored node with a garbage revision as revision 0', async () => {
    mockServer({ sections: [], rev: 'abc' });
    const saved = await saveHomeLayout(createDefaultHomeLayout(), 0);
    expect(saved.rev).toBe(1);
  });
});
