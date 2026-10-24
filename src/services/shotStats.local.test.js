import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../firebase.js', () => ({ isFirebaseEnabled: false, db: null }));

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

const { subscribeToShotStats, recordShotView, setShotLiked, readLikedShots } = await import('./shotStats.js');

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('shotStats (local mode)', () => {
  it('counts a view once per session per shot', async () => {
    let latest = {};
    const stop = subscribeToShotStats((s) => { latest = s; });
    expect(await recordShotView('p_0')).toBe(true);
    expect(await recordShotView('p_0')).toBe(false);
    expect(await recordShotView('p_1')).toBe(true);
    expect(latest.p_0.views).toBe(1);
    expect(latest.p_1.views).toBe(1);
    stop();
  });

  it('likes and unlikes, remembering the device state', async () => {
    let latest = {};
    subscribeToShotStats((s) => { latest = s; });
    expect(await setShotLiked('p_0', true)).toBe(true);
    expect(latest.p_0.likes).toBe(1);
    expect(readLikedShots().has('p_0')).toBe(true);
    // Liking again does not add a second like.
    await setShotLiked('p_0', true);
    expect(latest.p_0.likes).toBe(1);
    expect(await setShotLiked('p_0', false)).toBe(false);
    expect(latest.p_0.likes).toBe(0);
    expect(readLikedShots().has('p_0')).toBe(false);
  });

  it('never goes below zero and ignores invalid ids', async () => {
    let latest = {};
    subscribeToShotStats((s) => { latest = s; });
    await setShotLiked('p_9', false);
    expect(latest.p_9).toBeUndefined();
    expect(await recordShotView('../hack')).toBe(false);
    expect(await setShotLiked('a b', true)).toBe(false);
    expect(Object.keys(latest)).toEqual([]);
  });

  it('ignores corrupt stored data', () => {
    localStorage.setItem('shotStats', 'not json');
    localStorage.setItem('a2z_shot_likes', '{"a":1}');
    let latest = null;
    subscribeToShotStats((s) => { latest = s; });
    expect(latest).toEqual({});
    expect(readLikedShots().size).toBe(0);
  });
});
