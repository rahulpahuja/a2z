import { describe, it, expect, vi, beforeEach } from 'vitest';

const update = vi.fn();
vi.mock('../firebase.js', () => ({ isFirebaseEnabled: true, db: {} }));
vi.mock('firebase/database', () => ({
  ref: (_db, path) => ({ path }),
  onValue: vi.fn(),
  increment: (n) => ({ increment: n }),
  update: (...args) => update(...args),
}));
for (const name of ['localStorage', 'sessionStorage']) {
  if (typeof globalThis[name] === 'undefined') {
    const store = new Map();
    globalThis[name] = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    };
  }
}

const { recordShotView, setShotLiked, readLikedShots } = await import('./shotStats.js');

beforeEach(() => {
  update.mockReset();
  update.mockResolvedValue(undefined);
  localStorage.clear();
  sessionStorage.clear();
});

describe('shotStats (Firebase)', () => {
  it('writes an atomic +1 to the shot only', async () => {
    await recordShotView('prod_1_0');
    expect(update).toHaveBeenCalledWith({ path: 'shotStats/prod_1_0' }, { views: { increment: 1 } });
  });

  it('writes +1 for a like and -1 for an unlike', async () => {
    await setShotLiked('prod_1_0', true);
    await setShotLiked('prod_1_0', false);
    expect(update.mock.calls.map((c) => c[1])).toEqual([{ likes: { increment: 1 } }, { likes: { increment: -1 } }]);
  });

  it('puts the device state back when the server rejects a like', async () => {
    update.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
    await expect(setShotLiked('prod_1_0', true)).rejects.toThrow('PERMISSION_DENIED');
    expect(readLikedShots().has('prod_1_0')).toBe(false);
  });

  it('swallows a failed view write so watching a short never breaks', async () => {
    update.mockRejectedValueOnce(new Error('offline'));
    expect(await recordShotView('prod_2_0')).toBe(false);
  });

  it('never writes for an invalid id', async () => {
    await recordShotView('x/../y');
    await setShotLiked('a b', true);
    expect(update).not.toHaveBeenCalled();
  });
});
