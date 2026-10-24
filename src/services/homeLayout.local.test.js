import { describe, it, expect, vi, beforeEach } from 'vitest';

// The no-Firebase branch of services/homeLayout.js (firebase.js: isFirebaseEnabled is
// false whenever VITE_FIREBASE_API_KEY isn't set).
vi.mock('../firebase.js', () => ({ isFirebaseEnabled: false, db: null }));

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

const { subscribeToHomeLayout, saveHomeLayout, resetHomeLayout, getCachedHomeLayout, HomeLayoutConflictError } =
  await import('./homeLayout.js');
const { createDefaultHomeLayout, moveSection, SECTION_IDS } = await import('../utils/homeLayout.js');

beforeEach(() => {
  localStorage.clear();
});

describe('homeLayout service (local mode)', () => {
  it('serves the default layout when nothing is stored', () => {
    expect(getCachedHomeLayout().sections.map((s) => s.id)).toEqual(SECTION_IDS);
  });

  it('falls back to the default layout when the stored value is corrupt', () => {
    localStorage.setItem('settings/homeLayout', '{not json');
    expect(getCachedHomeLayout().sections.map((s) => s.id)).toEqual(SECTION_IDS);
  });

  it('saves, bumps the revision and notifies subscribers', async () => {
    const seen = [];
    const unsubscribe = subscribeToHomeLayout((layout) => seen.push(layout));
    const edited = moveSection(createDefaultHomeLayout(), 0, 2);
    const saved = await saveHomeLayout(edited, 0);
    expect(saved.rev).toBe(1);
    expect(saved.sections[2].id).toBe('hero');
    expect(seen.at(-1).sections[2].id).toBe('hero');
    unsubscribe();
  });

  it('rejects a save made from a stale revision and leaves the stored layout alone', async () => {
    await saveHomeLayout(createDefaultHomeLayout(), 0); // rev 1
    const stale = moveSection(createDefaultHomeLayout(), 0, 3);
    await expect(saveHomeLayout(stale, 0)).rejects.toBeInstanceOf(HomeLayoutConflictError);
    expect(getCachedHomeLayout().rev).toBe(1);
    expect(getCachedHomeLayout().sections[0].id).toBe('hero');
  });

  it('normalizes what it stores, so garbage in a draft cannot reach the storefront', async () => {
    const dirty = { sections: [{ id: 'nope' }, { id: 'trending', cardWidth: 99999 }], products: { top: ['a', 'a'] } };
    const saved = await saveHomeLayout(dirty, 0);
    expect(saved.sections.map((s) => s.id).sort()).toEqual([...SECTION_IDS].sort());
    expect(saved.sections.find((s) => s.id === 'trending').cardWidth).toBe(480);
    expect(saved.products.top).toEqual(['a']);
  });

  it('resets to the default order with a new revision', async () => {
    const first = await saveHomeLayout(moveSection(createDefaultHomeLayout(), 0, 4), 0);
    const reset = await resetHomeLayout(first.rev);
    expect(reset.rev).toBe(2);
    expect(reset.sections.map((s) => s.id)).toEqual(SECTION_IDS);
  });
});
