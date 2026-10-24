import { describe, it, expect } from 'vitest';
import { createEmptyPost, duplicatePost, effectiveExcerpt, normalizePost, normalizeTags, toIndexEntry, toPublicRecord, validatePost } from './post.js';
import { BLOG_TYPES, buildStarterDoc, getBlogType, validateAssociations } from './types.js';
import { buildDeleteWrites, buildPublishWrites, buildUnpublishWrites, selectDuePosts } from './writes.js';
import { sanitizeDoc } from './doc.js';

const body = (text) => JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const base = (over = {}) => ({ id: 'b1', type: 'general', title: 'Hello World', slug: 'hello-world', body: body('Some words here.'), status: 'draft', ...over });

describe('normalizePost', () => {
  it('falls back to safe defaults for junk', () => {
    for (const raw of [null, undefined, 'x', 5, []]) {
      const post = normalizePost(raw);
      expect(post).toMatchObject({ type: 'general', status: 'draft', title: '', productIds: [], tags: [], publishedAt: null });
      expect(JSON.parse(post.body).type).toBe('doc');
    }
  });

  it('trims, caps and de-duplicates', () => {
    const post = normalizePost({
      title: `  ${'x'.repeat(500)}  `,
      tags: ['Kurti', 'kurti', ' Winter  ', 'bad<tag>', '', 'x'.repeat(100), ...Array.from({ length: 30 }, (_, i) => `t${i}`)],
      productIds: ['a', 'a', 'b c', '<x>', 'ok-1'],
      type: 'not-a-type',
      status: 'nope',
    });
    expect(post.title.length).toBe(160);
    expect(post.tags[0]).toBe('kurti');
    expect(post.tags[1]).toBe('winter');
    expect(post.tags).not.toContain('bad<tag>');
    expect(post.tags.length).toBeLessThanOrEqual(12);
    expect(post.productIds).toEqual(['a', 'ok-1']);
    expect(post.type).toBe('general');
    expect(post.status).toBe('draft');
  });

  it('accepts Realtime Database sparse arrays', () => {
    expect(normalizePost({ productIds: { 0: 'a', 2: 'c' } }).productIds).toEqual(['a', 'c']);
    expect(normalizeTags({ 0: 'one', 1: 'two' })).toEqual(['one', 'two']);
  });

  it('only keeps a hero product / primary collection that is actually associated', () => {
    const post = normalizePost({ productIds: ['a'], heroProductId: 'zzz', collectionIds: ['c'], primaryCollectionId: 'other' });
    expect(post.heroProductId).toBe('');
    expect(post.primaryCollectionId).toBe('');
    expect(normalizePost({ productIds: ['a'], heroProductId: 'a' }).heroProductId).toBe('a');
  });

  it('sanitizes the body and is idempotent', () => {
    const evil = JSON.stringify({ type: 'doc', content: [{ type: 'script' }, { type: 'image', attrs: { src: 'javascript:alert(1)' } }] });
    const once = normalizePost(base({ body: evil }));
    expect(JSON.parse(once.body)).toEqual(sanitizeDoc(null));
    expect(normalizePost(once)).toEqual(once);
  });
});

describe('validatePost', () => {
  it('lets an unfinished draft be saved with only a title and slug', () => {
    expect(validatePost(base({ type: 'multi' })).errors).toEqual([]);
    expect(validatePost({ type: 'general' }).errors.map((e) => e.field)).toEqual(['title', 'slug']);
  });

  it('blocks publishing an empty article or one that breaks its type rules', () => {
    const empty = validatePost(base({ body: body('   ') }), { forPublish: true });
    expect(empty.errors.map((e) => e.field)).toContain('body');
    const spotlight = validatePost(base({ type: 'spotlight' }), { forPublish: true });
    expect(spotlight.errors.some((e) => e.field === 'products')).toBe(true);
    const ok = validatePost(base({ type: 'spotlight', productIds: ['p1'] }), { forPublish: true });
    expect(ok.errors).toEqual([]);
  });

  it('warns, without blocking, about missing author, cover and category', () => {
    const { errors, warnings } = validatePost(base(), { forPublish: true });
    expect(errors).toEqual([]);
    expect(warnings.map((w) => w.field)).toEqual(expect.arrayContaining(['author', 'coverImage', 'categoryId']));
  });

  it('rejects a malformed slug', () => {
    expect(validatePost(base({ slug: 'Bad Slug' })).errors.map((e) => e.field)).toContain('slug');
  });
});

describe('blog types', () => {
  it('has the eight formats with unique ids', () => {
    expect(BLOG_TYPES).toHaveLength(8);
    expect(new Set(BLOG_TYPES.map((t) => t.id)).size).toBe(8);
    expect(getBlogType('nope').id).toBe('general');
  });

  it('enforces product counts per type', () => {
    expect(validateAssociations('spotlight', { productIds: ['a', 'b'] })[0]).toMatch(/at most 1/);
    expect(validateAssociations('spotlight', { productIds: [] }, { requireForPublish: true })[0]).toMatch(/exactly 1/);
    expect(validateAssociations('comparison', { productIds: ['a'] }, { requireForPublish: true })[0]).toMatch(/at least 2/);
    expect(validateAssociations('comparison', { productIds: ['a', 'b', 'c', 'd', 'e'] })[0]).toMatch(/at most 4/);
    expect(validateAssociations('general', { productIds: [] }, { requireForPublish: true })).toEqual([]);
    expect(validateAssociations('collection', { productIds: [], collectionIds: [] }, { requireForPublish: true }).join(' ')).toMatch(/collection/);
    expect(validateAssociations('collection', { collectionIds: ['c1'], primaryCollectionId: 'c2' })[0]).toMatch(/primary collection/);
  });

  it('builds a valid starter document for every type, placing only the products chosen', () => {
    for (const { id } of BLOG_TYPES) {
      const doc = buildStarterDoc(id, { productIds: ['p1', 'p2'], collectionIds: ['c1'] });
      expect(sanitizeDoc(doc)).toEqual(doc);
    }
    expect(JSON.stringify(buildStarterDoc('spotlight', { productIds: ['p1', 'p2'] }))).not.toContain('p2');
    expect(JSON.stringify(buildStarterDoc('guide', { productIds: [] }))).not.toContain('productCard');
  });
});

describe('stored shapes', () => {
  const post = normalizePost(base({ status: 'published', publishedAt: 1000, tags: ['kurti'], productIds: ['p1'], seoTitle: 'T', draftOnly: 'x' }));

  it('the index entry carries card data and searchable text but not the body', () => {
    const entry = toIndexEntry(post);
    expect(entry).toMatchObject({ id: 'b1', slug: 'hello-world', publishedAt: 1000, productCount: 1, readingMinutes: 1 });
    expect(entry.searchText).toBe('Some words here.');
    expect(entry.body).toBeUndefined();
  });

  it('falls back to the start of the article when there is no excerpt', () => {
    expect(effectiveExcerpt(post)).toBe('Some words here.');
    expect(effectiveExcerpt({ ...post, excerpt: 'Custom' })).toBe('Custom');
  });

  it('the public record is always marked published and drops admin-only fields', () => {
    const record = toPublicRecord({ ...post, status: 'draft', publishAt: 5, previousSlugs: ['old'] });
    expect(record.status).toBe('published');
    expect(record.publishAt).toBeUndefined();
    expect(record.previousSlugs).toBeUndefined();
    expect(record.body).toBe(post.body);
  });

  it('duplicates into a fresh draft', () => {
    const copy = duplicatePost({ ...post, featured: true, previousSlugs: ['x'] }, { id: 'b2', now: 5 });
    expect(copy).toMatchObject({ id: 'b2', status: 'draft', slug: '', featured: false, publishedAt: null, createdAt: 5, previousSlugs: [] });
    expect(copy.title).toBe('Copy of Hello World');
    expect(copy.productIds).toEqual(['p1']);
  });

  it('creates an empty draft of a type', () => {
    expect(createEmptyPost({ id: 'x1', type: 'gift', now: 7 })).toMatchObject({ id: 'x1', type: 'gift', status: 'draft', createdAt: 7 });
  });
});

describe('publish / unpublish / delete writes', () => {
  const post = base({ productIds: ['p1'] });

  it('publishes atomically: public record, index, slug map and the admin copy', () => {
    const w = buildPublishWrites({ post, now: 5000 });
    expect(Object.keys(w).sort()).toEqual(
      ['blogs/admin/b1', 'blogs/index/b1', 'blogs/public/b1', 'blogs/redirects/hello-world', 'blogs/slugs/hello-world'].sort()
    );
    expect(w['blogs/slugs/hello-world']).toBe('b1');
    expect(w['blogs/public/b1']).toMatchObject({ status: 'published', publishedAt: 5000 });
    expect(w['blogs/admin/b1']).toMatchObject({ status: 'published', publishedAt: 5000, publishAt: null });
    expect(w['blogs/redirects/hello-world']).toBeNull();
  });

  it('keeps the original publication date when a live post is updated', () => {
    const w = buildPublishWrites({ post: { ...post, status: 'published', publishedAt: 1234 }, now: 9999 });
    expect(w['blogs/public/b1'].publishedAt).toBe(1234);
  });

  it('redirects the old URL to the new one when the slug of a live post changes', () => {
    const w = buildPublishWrites({ post: { ...post, slug: 'new-name' }, previousPublishedSlug: 'hello-world', now: 1 });
    expect(w['blogs/slugs/hello-world']).toBeNull();
    expect(w['blogs/slugs/new-name']).toBe('b1');
    expect(w['blogs/redirects/hello-world']).toBe('new-name');
    expect(w['blogs/admin/b1'].previousSlugs).toEqual(['hello-world']);
  });

  it('keeps redirect chains one hop long', () => {
    const redirects = { first: 'hello-world' };
    const w = buildPublishWrites({ post: { ...post, slug: 'third' }, previousPublishedSlug: 'hello-world', redirects, now: 1 });
    expect(w['blogs/redirects/first']).toBe('third');
    expect(w['blogs/redirects/hello-world']).toBe('third');
  });

  it('removes a redirect when the post returns to a slug it used before', () => {
    const w = buildPublishWrites({ post: { ...post, slug: 'hello-world', previousSlugs: ['hello-world', 'other'] }, now: 1 });
    expect(w['blogs/redirects/hello-world']).toBeNull();
    expect(w['blogs/redirects/other']).toBe('hello-world');
    expect(w['blogs/admin/b1'].previousSlugs).toEqual(['other']);
  });

  it('refuses to publish without an id or a valid slug', () => {
    expect(() => buildPublishWrites({ post: { ...post, slug: 'Bad Slug' } })).toThrow(/valid slug/);
    expect(() => buildPublishWrites({ post: { ...post, id: '' } })).toThrow();
  });

  it('unpublishing removes every public copy but keeps the draft', () => {
    const w = buildUnpublishWrites({ post: { ...post, status: 'published' }, status: 'archived', now: 3 });
    expect(w['blogs/public/b1']).toBeNull();
    expect(w['blogs/index/b1']).toBeNull();
    expect(w['blogs/slugs/hello-world']).toBeNull();
    expect(w['blogs/admin/b1']).toMatchObject({ status: 'archived', title: 'Hello World' });
    expect(() => buildUnpublishWrites({ post, status: 'published' })).toThrow();
  });

  it('deleting clears the post, its slug claims and redirects pointing at it', () => {
    const w = buildDeleteWrites({ post: { ...post, previousSlugs: ['old'] }, redirects: { older: 'old', unrelated: 'zzz' } });
    expect(w['blogs/admin/b1']).toBeNull();
    expect(w['blogs/slugClaims/hello-world']).toBeNull();
    expect(w['blogs/slugClaims/old']).toBeNull();
    expect(w['blogs/redirects/older']).toBeNull();
    expect(w['blogs/redirects/unrelated']).toBeUndefined();
  });

  it('selects only due scheduled posts, oldest first', () => {
    const posts = [
      base({ id: 'a', status: 'scheduled', publishAt: 300 }),
      base({ id: 'b', status: 'scheduled', publishAt: 100 }),
      base({ id: 'c', status: 'scheduled', publishAt: 9000 }),
      base({ id: 'd', status: 'draft', publishAt: 50 }),
    ];
    expect(selectDuePosts(posts, 500).map((p) => p.id)).toEqual(['b', 'a']);
  });
});
