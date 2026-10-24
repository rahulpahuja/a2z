import { describe, it, expect } from 'vitest';
import { filterEntries, formatPublishedDate, getNeighbours, pickRelatedPosts, topTags } from './related.js';
import { buildBlogPostHead, blogNotFoundHead, blogUrl } from '../../seo/blogHead.js';
import { renderHeadTags } from '../../seo/head.js';
import { normalizePost } from './post.js';

const e = (id, over = {}) => ({ id, slug: id, title: `Post ${id}`, excerpt: '', tags: [], categoryId: '', publishedAt: Number(id.replace(/\D/g, '')) || 0, searchText: '', ...over });

describe('pickRelatedPosts', () => {
  const post = { id: 'p1', categoryId: 'style', tags: ['kurti', 'winter'], primaryCollectionId: '' };

  it('ranks by category, then shared tags, then recency, and omits unrelated posts and itself', () => {
    const entries = [
      e('p1', { categoryId: 'style' }),
      e('p2', { categoryId: 'style', publishedAt: 5 }),
      e('p3', { tags: ['kurti', 'winter'], publishedAt: 9 }),
      e('p4', { categoryId: 'care', tags: [], publishedAt: 20 }),
      e('p5', { categoryId: 'style', tags: ['kurti'], publishedAt: 1 }),
    ];
    expect(pickRelatedPosts(post, entries).map((x) => x.id)).toEqual(['p5', 'p3', 'p2']);
  });

  it('limits the result and tolerates empty input', () => {
    expect(pickRelatedPosts(post, [e('a', { categoryId: 'style' }), e('b', { categoryId: 'style' })], 1)).toHaveLength(1);
    expect(pickRelatedPosts(post, undefined)).toEqual([]);
  });
});

describe('getNeighbours', () => {
  const entries = [e('p1'), e('p2'), e('p3')];
  it('finds the newer and older articles, with null at the ends', () => {
    expect(getNeighbours({ id: 'p2' }, entries)).toEqual({ newer: entries[2], older: entries[0] });
    expect(getNeighbours({ id: 'p3' }, entries).newer).toBeNull();
    expect(getNeighbours({ id: 'p1' }, entries).older).toBeNull();
    expect(getNeighbours({ id: 'zz' }, entries)).toEqual({ newer: null, older: null });
  });
});

describe('filterEntries / topTags', () => {
  const entries = [
    e('p1', { title: 'Winter Kurti Guide', tags: ['kurti'], categoryId: 'style', searchText: 'wool lining and layers' }),
    e('p2', { title: 'Denim Care', tags: ['denim'], categoryId: 'care', excerpt: 'wash cold' }),
  ];
  it('matches every word across title, excerpt, tags and body text, ignoring case', () => {
    expect(filterEntries(entries, { query: 'WINTER layers' }).map((x) => x.id)).toEqual(['p1']);
    expect(filterEntries(entries, { query: 'wash' }).map((x) => x.id)).toEqual(['p2']);
    expect(filterEntries(entries, { query: 'denim kurti' })).toEqual([]);
    expect(filterEntries(entries, { query: '   ' })).toHaveLength(2);
  });
  it('combines category and tag filters', () => {
    expect(filterEntries(entries, { categoryId: 'care' }).map((x) => x.id)).toEqual(['p2']);
    expect(filterEntries(entries, { tag: 'kurti', categoryId: 'care' })).toEqual([]);
  });
  it('lists tags by frequency', () => {
    expect(topTags([e('a', { tags: ['x', 'y'] }), e('b', { tags: ['y'] })])).toEqual([{ tag: 'y', count: 2 }, { tag: 'x', count: 1 }]);
  });
  it('formats dates and ignores missing ones', () => {
    expect(formatPublishedDate(Date.UTC(2026, 9, 24, 12))).toMatch(/24 October 2026/);
    expect(formatPublishedDate(0)).toBe('');
    expect(formatPublishedDate(undefined)).toBe('');
  });
});

describe('buildBlogPostHead', () => {
  const body = JSON.stringify({ type: 'doc', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Fit <guide>' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Body text here.' }] }] });
  const post = normalizePost({ id: 'b1', slug: 'winter-guide', title: 'Winter Guide', body, author: 'Rahul', coverImage: 'https://cdn.test/c.jpg', tags: ['winter'], publishedAt: Date.UTC(2026, 0, 2), updatedAt: Date.UTC(2026, 0, 3), status: 'published' });

  it('builds a canonical, indexable head with article and breadcrumb data', () => {
    const head = buildBlogPostHead(post, { categoryName: 'Style' });
    expect(head.canonical).toBe(blogUrl('winter-guide'));
    expect(head.canonical).toBe('https://www.thea2zcollection.com/blogs/winter-guide');
    expect(head.robots).toBe('index, follow');
    expect(head.title).toBe('Winter Guide | A2Z Collection');
    expect(head.ogType).toBe('article');
    expect(head.ogImage).toBe('https://cdn.test/c.jpg');
    const [article, crumbs] = head.jsonLd;
    expect(article).toMatchObject({ '@type': 'BlogPosting', headline: 'Winter Guide', datePublished: '2026-01-02T00:00:00.000Z', dateModified: '2026-01-03T00:00:00.000Z', author: { '@type': 'Person', name: 'Rahul' } });
    expect(crumbs.itemListElement.map((c) => c.name)).toEqual(['Home', 'Blog', 'Style', 'Winter Guide']);
    expect(JSON.stringify(head.jsonLd)).not.toContain('"Product"');
  });

  it('prefers the SEO title, description and OG image when set, and falls back to the brand as author', () => {
    const head = buildBlogPostHead({ ...post, seoTitle: 'Custom A2Z Collection title', seoDescription: 'Custom description', ogImage: 'https://cdn.test/og.jpg', author: '' });
    expect(head.title).toBe('Custom A2Z Collection title');
    expect(head.description).toBe('Custom description');
    expect(head.ogImage).toBe('https://cdn.test/og.jpg');
    expect(head.jsonLd[0].author).toEqual({ '@type': 'Organization', name: 'A2Z Collection' });
  });

  it('ignores non-https images and escapes crawlable text', () => {
    const head = buildBlogPostHead({ ...post, coverImage: 'http://x/y.jpg', ogImage: 'javascript:x' });
    expect(head.ogImage).toBeUndefined();
    expect(head.noscript).toContain('Fit &lt;guide&gt;');
    expect(head.noscript).not.toContain('<guide>');
    expect(renderHeadTags(head)).toContain('rel="canonical"');
  });

  it('a missing article is a noindex 404', () => {
    expect(blogNotFoundHead().robots).toBe('noindex, nofollow');
  });
});
