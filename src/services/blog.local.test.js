import { describe, it, expect, vi, beforeEach } from 'vitest';

// The blog service against the localStorage backend (what runs when Firebase isn't configured). The
// logic is shared with the Firebase backend, so this covers publishing, slugs and visibility.
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

const blog = await import('./blog.js');
const store = await import('./blogStore.js');

const doc = (text) => JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const make = (over = {}) => ({ ...blog.createDraft('general', { now: 1 }), title: 'Hello World', body: doc('Some real words.'), ...over });

beforeEach(() => {
  localStorage.clear();
});

describe('saving drafts', () => {
  it('creates a draft with a slug generated from the title, and keeps it out of the public tree', async () => {
    const saved = await blog.savePost(make(), { now: 10 });
    expect(saved).toMatchObject({ slug: 'hello-world', status: 'draft', createdAt: 1, updatedAt: 10 });
    expect(await store.readOnce('blogs/public')).toBeNull();
    expect(await store.readOnce('blogs/index')).toBeNull();
    expect((await blog.getAdminPost(saved.id)).title).toBe('Hello World');
  });

  it('requires a title but nothing else for a draft', async () => {
    await expect(blog.savePost(make({ title: '' }))).rejects.toMatchObject({ code: 'invalid' });
    await expect(blog.savePost(make({ body: '' }))).resolves.toMatchObject({ status: 'draft' });
  });

  it('gives two articles with the same title different slugs', async () => {
    const a = await blog.savePost(make());
    const b = await blog.savePost(make());
    expect(a.slug).toBe('hello-world');
    expect(b.slug).toBe('hello-world-2');
  });

  it('refuses a slug that another article owns, and an invalid slug', async () => {
    await blog.savePost(make({ slug: 'taken' }));
    await expect(blog.savePost(make({ slug: 'taken' }))).rejects.toMatchObject({ code: 'slug_taken' });
    await expect(blog.savePost(make({ slug: 'Bad Slug' }))).rejects.toMatchObject({ code: 'invalid_slug' });
  });

  it('releases the old slug when an unpublished draft is renamed', async () => {
    const a = await blog.savePost(make({ slug: 'first-name' }));
    await blog.savePost({ ...a, slug: 'second-name' });
    const other = await blog.savePost(make({ slug: 'first-name' }));
    expect(other.slug).toBe('first-name');
  });

  it('rejects too many products for the article type', async () => {
    await expect(blog.savePost(make({ type: 'spotlight', productIds: ['a', 'b'] }))).rejects.toMatchObject({ code: 'invalid' });
  });
});

describe('publishing and public visibility', () => {
  it('makes a published article readable by slug, and nothing else readable', async () => {
    const draft = await blog.savePost(make());
    const other = await blog.savePost(make({ title: 'Secret Draft' }));
    await blog.publishPost(draft.id, { now: 500 });

    const found = await blog.fetchPublishedBySlug('hello-world');
    expect(found.status).toBe('ok');
    expect(found.post).toMatchObject({ id: draft.id, status: 'published', publishedAt: 500 });
    expect((await blog.fetchPublishedBySlug(other.slug)).status).toBe('notfound');
    expect((await blog.fetchPublishedBySlug('nope')).status).toBe('notfound');
    expect((await blog.fetchPublishedBySlug('../etc')).status).toBe('notfound');
  });

  it('lists only published articles in the index, newest first', async () => {
    const a = await blog.savePost(make({ title: 'Older' }));
    const b = await blog.savePost(make({ title: 'Newer' }));
    await blog.savePost(make({ title: 'Never published' }));
    await blog.publishPost(a.id, { now: 100 });
    await blog.publishPost(b.id, { now: 200 });
    let list = [];
    blog.subscribeToBlogIndex((rows) => { list = rows; });
    expect(list.map((r) => r.title)).toEqual(['Newer', 'Older']);
    expect(list[0].readingMinutes).toBe(1);
    expect(list[0].body).toBeUndefined();
  });

  it('blocks publishing an empty article or one that breaks its type rules', async () => {
    const empty = await blog.savePost(make({ body: '' }));
    await expect(blog.publishPost(empty.id)).rejects.toMatchObject({ code: 'not_publishable' });
    const spot = await blog.savePost(make({ type: 'spotlight' }));
    await expect(blog.publishPost(spot.id)).rejects.toMatchObject({ code: 'not_publishable' });
  });

  it('removes the article from the public site when unpublished or archived, keeping the draft', async () => {
    const a = await blog.savePost(make());
    await blog.publishPost(a.id);
    await blog.unpublishPost(a.id, 'archived');
    expect((await blog.fetchPublishedBySlug('hello-world')).status).toBe('notfound');
    expect((await blog.getAdminPost(a.id)).status).toBe('archived');
    expect(await store.readOnce('blogs/index')).toBeNull();
  });

  it('only allows the intended status transitions', async () => {
    const a = await blog.savePost(make());
    await expect(blog.unpublishPost(a.id, 'draft')).rejects.toMatchObject({ code: 'bad_transition' });
    await blog.publishPost(a.id);
    await expect(blog.schedulePost(a.id, Date.now() + 1e7)).rejects.toMatchObject({ code: 'bad_transition' });
  });
});

describe('editing a live article', () => {
  it('keeps the publication date, updates the public copy and redirects the old slug', async () => {
    const a = await blog.savePost(make());
    await blog.publishPost(a.id, { now: 100 });
    const live = await blog.getAdminPost(a.id);
    await blog.savePost({ ...live, title: 'Renamed', slug: 'renamed', body: doc('Updated text.') }, { now: 900 });

    const fresh = await blog.fetchPublishedBySlug('renamed');
    expect(fresh.post).toMatchObject({ title: 'Renamed', publishedAt: 100 });
    expect(fresh.post.body).toContain('Updated text.');
    expect(await blog.fetchPublishedBySlug('hello-world')).toEqual({ status: 'redirect', slug: 'renamed' });
  });

  it('keeps redirects one hop after several renames', async () => {
    const a = await blog.savePost(make());
    await blog.publishPost(a.id);
    let current = await blog.getAdminPost(a.id);
    for (const slug of ['second', 'third']) {
      current = await blog.savePost({ ...current, slug });
    }
    expect(await blog.fetchPublishedBySlug('hello-world')).toEqual({ status: 'redirect', slug: 'third' });
    expect(await blog.fetchPublishedBySlug('second')).toEqual({ status: 'redirect', slug: 'third' });
  });

  it('does not let another article take a slug that is still redirecting', async () => {
    const a = await blog.savePost(make());
    await blog.publishPost(a.id);
    const live = await blog.getAdminPost(a.id);
    await blog.savePost({ ...live, slug: 'moved' });
    await expect(blog.savePost(make({ slug: 'hello-world' }))).rejects.toMatchObject({ code: 'slug_taken' });
  });
});

describe('scheduling', () => {
  it('stores a scheduled article privately until its time', async () => {
    const a = await blog.savePost(make());
    const now = 1_000_000;
    await expect(blog.schedulePost(a.id, now + 1000, { now })).rejects.toMatchObject({ code: 'bad_time' });
    const scheduled = await blog.schedulePost(a.id, now + 3_600_000, { now });
    expect(scheduled).toMatchObject({ status: 'scheduled', publishAt: now + 3_600_000 });
    expect((await blog.fetchPublishedBySlug('hello-world')).status).toBe('notfound');
    expect(await store.readOnce('blogs/public')).toBeNull();
  });

  it('refuses to schedule an article that could not be published', async () => {
    const empty = await blog.savePost(make({ body: '' }));
    await expect(blog.schedulePost(empty.id, Date.now() + 3_600_000)).rejects.toMatchObject({ code: 'not_publishable' });
  });
});

describe('deleting, duplicating and categories', () => {
  it('deleting removes every trace including the slug claim', async () => {
    const a = await blog.savePost(make());
    await blog.publishPost(a.id);
    await blog.deletePost(a.id);
    expect(await blog.getAdminPost(a.id)).toBeNull();
    expect((await blog.fetchPublishedBySlug('hello-world')).status).toBe('notfound');
    expect(await store.readOnce('blogs/slugClaims/hello-world')).toBeNull();
    const reuse = await blog.savePost(make());
    expect(reuse.slug).toBe('hello-world');
  });

  it('duplicates into a separate draft with its own slug', async () => {
    const a = await blog.savePost(make({ productIds: ['p1'] }));
    await blog.publishPost(a.id);
    const copy = await blog.duplicate(a.id);
    expect(copy).toMatchObject({ status: 'draft', title: 'Copy of Hello World', productIds: ['p1'] });
    expect(copy.id).not.toBe(a.id);
    expect(copy.slug).not.toBe('hello-world');
  });

  it('saves and lists categories', async () => {
    await blog.saveCategory({ name: '  Style  Guides ' });
    await blog.saveCategory({ name: 'Care' });
    let list = [];
    blog.subscribeToCategories((rows) => { list = rows; });
    expect(list.map((c) => c.name)).toEqual(['Care', 'Style Guides']);
    await expect(blog.saveCategory({ name: '   ' })).rejects.toMatchObject({ code: 'invalid' });
    await blog.deleteCategory('care');
    expect(list.map((c) => c.name)).toEqual(['Style Guides']);
  });
});

describe('untrusted stored data', () => {
  it('sanitizes a tampered public record when reading it', async () => {
    const a = await blog.savePost(make());
    await blog.publishPost(a.id);
    const record = await store.readOnce(`blogs/public/${a.id}`);
    await store.applyWrites({
      [`blogs/public/${a.id}`]: { ...record, body: JSON.stringify({ type: 'doc', content: [{ type: 'script' }, { type: 'image', attrs: { src: 'javascript:alert(1)' } }] }) },
    });
    const { post } = await blog.fetchPublishedBySlug('hello-world');
    expect(JSON.parse(post.body).content).toEqual([{ type: 'paragraph' }]);
  });
});
