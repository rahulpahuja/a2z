import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../firebase.js', () => ({ isFirebaseEnabled: false, db: null }));
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

const { createCollection, updateCollection, subscribeToCollections, CollectionLimitError } = await import('./collections.js');
const { MAX_PUBLISHED_COLLECTIONS, PUBLISH_LIMIT_MESSAGE, canPublishCollection, countPublished, formatCollectionDate } = await import('../utils/collections.js');

const input = (over = {}) => ({ name: 'Winter', productIds: [], published: true, ...over });
const list = () => {
  let rows = [];
  subscribeToCollections((r) => { rows = r; })();
  return rows;
};

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe('publish limit', () => {
  it('is 11', () => {
    expect(MAX_PUBLISHED_COLLECTIONS).toBe(11);
  });

  it('allows 11 published collections and refuses a 12th with a clear message', async () => {
    for (let i = 0; i < 11; i += 1) await createCollection(input({ name: `C${i}` }));
    expect(countPublished(list())).toBe(11);
    await expect(createCollection(input({ name: 'Twelfth' }))).rejects.toBeInstanceOf(CollectionLimitError);
    await expect(createCollection(input({ name: 'Twelfth' }))).rejects.toThrow(/Unpublish one first/);
    expect(list()).toHaveLength(11);
  });

  it('lets a hidden collection be created at any time', async () => {
    for (let i = 0; i < 11; i += 1) await createCollection(input({ name: `C${i}` }));
    await expect(createCollection(input({ name: 'Draft', published: false }))).resolves.toMatchObject({ name: 'Draft' });
  });

  it('blocks publishing a hidden collection until one is unpublished, then allows it', async () => {
    const made = [];
    for (let i = 0; i < 11; i += 1) made.push(await createCollection(input({ name: `C${i}` })));
    const hidden = await createCollection(input({ name: 'Hidden', published: false }));
    await expect(updateCollection(hidden.id, { ...hidden, published: true })).rejects.toBeInstanceOf(CollectionLimitError);
    await updateCollection(made[0].id, { ...made[0], published: false });
    await expect(updateCollection(hidden.id, { ...hidden, published: true })).resolves.toMatchObject({ published: true });
    expect(countPublished(list())).toBe(11);
  });

  it('never blocks editing a collection that is already published', async () => {
    const made = [];
    for (let i = 0; i < 11; i += 1) made.push(await createCollection(input({ name: `C${i}` })));
    await expect(updateCollection(made[3].id, { ...made[3], name: 'Renamed' })).resolves.toMatchObject({ name: 'Renamed', published: true });
  });

  it('exposes the same rule to the UI', async () => {
    const rows = [];
    for (let i = 0; i < 11; i += 1) rows.push({ id: `c${i}`, published: true });
    expect(canPublishCollection(rows, { id: 'new', published: false })).toBe(false);
    expect(canPublishCollection(rows, null)).toBe(false);
    expect(canPublishCollection(rows, rows[0])).toBe(true);
    expect(canPublishCollection(rows.slice(1), { id: 'new', published: false })).toBe(true);
    expect(PUBLISH_LIMIT_MESSAGE).toMatch(/Unpublish one first/);
  });
});

describe('publishing date and last edited date', () => {
  it('stamps both when a published collection is created', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T10:00:00Z'));
    const c = await createCollection(input());
    expect(c.publishedAt).toBe(Date.parse('2026-10-24T10:00:00Z'));
    expect(c.updatedAt).toBe(Date.parse('2026-10-24T10:00:00Z'));
  });

  it('records no publishing date for a hidden collection, and stamps it when it is first published', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T10:00:00Z'));
    const c = await createCollection(input({ published: false }));
    expect(c.publishedAt).toBeUndefined();
    vi.setSystemTime(new Date('2026-10-25T09:00:00Z'));
    const p = await updateCollection(c.id, { ...c, published: true });
    expect(p.publishedAt).toBe(Date.parse('2026-10-25T09:00:00Z'));
  });

  it('keeps the original publishing date through edits but moves the last-edited date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T10:00:00Z'));
    const c = await createCollection(input());
    vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
    const edited = await updateCollection(c.id, { ...c, name: 'New name' });
    expect(edited.publishedAt).toBe(Date.parse('2026-10-24T10:00:00Z'));
    expect(edited.updatedAt).toBe(Date.parse('2026-10-26T12:00:00Z'));
  });

  it('records a fresh publishing date when a collection is unpublished and published again', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T10:00:00Z'));
    const c = await createCollection(input());
    vi.setSystemTime(new Date('2026-10-27T10:00:00Z'));
    const hidden = await updateCollection(c.id, { ...c, published: false });
    vi.setSystemTime(new Date('2026-10-28T10:00:00Z'));
    const again = await updateCollection(c.id, { ...hidden, published: true });
    expect(again.publishedAt).toBe(Date.parse('2026-10-28T10:00:00Z'));
  });

  it('formats dates, with a dash for collections created before dates were kept', () => {
    expect(formatCollectionDate(undefined)).toBe('—');
    expect(formatCollectionDate(0)).toBe('—');
    expect(formatCollectionDate(Date.parse('2026-10-24T10:00:00Z'))).toMatch(/24 Oct 2026/);
  });
});
