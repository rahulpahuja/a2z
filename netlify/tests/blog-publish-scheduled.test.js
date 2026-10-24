// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase-admin/app', () => ({ cert: (x) => x, getApps: () => [{}], initializeApp: () => {} }));
vi.mock('firebase-admin/database', () => ({ getDatabase: () => ({}) }));
const { publishDuePosts } = await import('../functions/blog-publish-scheduled.js');

const body = (text) => JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const scheduled = (id, over = {}) => ({ id, type: 'general', title: `Post ${id}`, slug: `post-${id}`, body: body('Words here.'), status: 'scheduled', publishAt: 1000, ...over });

// A tiny in-memory stand-in for the Admin SDK's database.
function fakeDb(tree) {
  const writes = [];
  const get = (path) => path.split('/').filter(Boolean).reduce((n, k) => n?.[k], tree) ?? null;
  const snap = (value) => ({ val: () => value, get: async () => snap(value) });
  const ref = (path = '') => ({
    orderByChild: () => ({ equalTo: (status) => ({ get: async () => snap(Object.fromEntries(Object.entries(get(path) ?? {}).filter(([, p]) => p.status === status))) }) }),
    get: async () => snap(get(path)),
    update: async (w) => { writes.push(w); },
  });
  return { db: { ref }, writes };
}

describe('publishDuePosts', () => {
  it('publishes only articles whose time has come, oldest first, as one multi-path write each', async () => {
    const { db, writes } = fakeDb({ blogs: { admin: { a: scheduled('a', { publishAt: 900 }), b: scheduled('b', { publishAt: 5000 }), c: scheduled('c', { publishAt: 100 }) } } });
    const result = await publishDuePosts(db, 1000);
    expect(result.published).toEqual(['c', 'a']);
    expect(writes).toHaveLength(2);
    expect(writes[0]['blogs/public/c']).toMatchObject({ status: 'published', publishedAt: 100 });
    expect(writes[0]['blogs/slugs/post-c']).toBe('c');
    expect(writes[0]['blogs/admin/c']).toMatchObject({ status: 'published', publishAt: null });
  });

  it('does nothing when nothing is due', async () => {
    const { db, writes } = fakeDb({ blogs: { admin: { b: scheduled('b', { publishAt: 5000 }) } } });
    expect(await publishDuePosts(db, 1000)).toEqual({ published: [], skipped: [] });
    expect(writes).toEqual([]);
  });

  it('skips an article that no longer passes the publish checks, without blocking the others', async () => {
    const { db, writes } = fakeDb({ blogs: { admin: { bad: scheduled('bad', { body: '', publishAt: 10 }), good: scheduled('good', { publishAt: 20 }) } } });
    const result = await publishDuePosts(db, 1000);
    expect(result.published).toEqual(['good']);
    expect(result.skipped).toEqual([{ id: 'bad', reason: 'The article is empty.' }]);
    expect(writes).toHaveLength(1);
  });

  it('keeps going after a failed write', async () => {
    const { db } = fakeDb({ blogs: { admin: { a: scheduled('a', { publishAt: 1 }), b: scheduled('b', { publishAt: 2 }) } } });
    const realRef = db.ref;
    let first = true;
    db.ref = (path) => {
      const r = realRef(path);
      if (!path) return { ...r, update: async (w) => { if (first) { first = false; throw new Error('boom'); } return r.update(w); } };
      return r;
    };
    const result = await publishDuePosts(db, 1000);
    expect(result.skipped).toEqual([{ id: 'a', reason: 'error' }]);
    expect(result.published).toEqual(['b']);
  });

  it('redirects the old slug if a live copy had a different one', async () => {
    const { db, writes } = fakeDb({ blogs: { admin: { a: scheduled('a', { slug: 'new-slug', publishAt: 1 }) }, public: { a: { id: 'a', slug: 'old-slug' } } } });
    await publishDuePosts(db, 1000);
    expect(writes[0]['blogs/redirects/old-slug']).toBe('new-slug');
    expect(writes[0]['blogs/slugs/old-slug']).toBeNull();
  });
});
