import { describe, it, expect } from 'vitest';
import { resolveBlogRoute } from './blogResolve.js';
import { buildBlogSitemap } from './blogSitemap.js';

const body = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello.' }] }] });
const tree = {
  'blogs/slugs/live-post': 'b1',
  'blogs/public/b1': { id: 'b1', slug: 'live-post', title: 'Live Post', body, status: 'published', publishedAt: 1000, categoryId: 'style' },
  'blogs/categories/style': { name: 'Style', slug: 'style' },
  'blogs/redirects/old-name': 'live-post',
  'blogs/redirects/loop': 'loop',
  'blogs/slugs/ghost': 'b2',
  'blogs/public/b2': { id: 'b2', slug: 'ghost', title: 'Ghost', body, status: 'draft', publishedAt: 1 },
};
const read = async (path) => tree[path] ?? null;

describe('resolveBlogRoute', () => {
  it('serves a published article with its own head', async () => {
    const r = await resolveBlogRoute(read, 'live-post');
    expect(r).toMatchObject({ kind: 'ok', status: 200 });
    expect(r.head.canonical).toBe('https://www.thea2zcollection.com/blogs/live-post');
    expect(r.head.jsonLd[1].itemListElement.map((c) => c.name)).toContain('Style');
  });

  it('is case-insensitive about the slug', async () => {
    expect((await resolveBlogRoute(read, 'Live-Post')).kind).toBe('ok');
  });

  it('redirects a renamed article permanently', async () => {
    expect(await resolveBlogRoute(read, 'old-name')).toEqual({ kind: 'redirect', status: 301, location: '/blogs/live-post' });
  });

  it('returns a noindex 404 for unknown, malformed, unpublished and looping slugs', async () => {
    for (const slug of ['nope', '../etc/passwd', 'Bad Slug', '', undefined, 'loop', 'ghost']) {
      const r = await resolveBlogRoute(read, slug);
      expect(r.kind, String(slug)).toBe('notfound');
      expect(r.status).toBe(404);
      expect(r.head.robots).toBe('noindex, nofollow');
    }
  });

  it('survives a failing category lookup', async () => {
    const flaky = async (path) => { if (path.startsWith('blogs/categories')) throw new Error('down'); return read(path); };
    expect((await resolveBlogRoute(flaky, 'live-post')).kind).toBe('ok');
  });
});

describe('buildBlogSitemap', () => {
  it('lists published articles newest first with their date', () => {
    const xml = buildBlogSitemap([{ slug: 'older', publishedAt: Date.UTC(2026, 0, 1) }, { slug: 'newer', publishedAt: Date.UTC(2026, 5, 1) }]);
    expect(xml.indexOf('/blogs/newer')).toBeLessThan(xml.indexOf('/blogs/older'));
    expect(xml).toContain('<lastmod>2026-06-01</lastmod>');
    expect(xml).toContain('<loc>https://www.thea2zcollection.com/blogs/newer</loc>');
  });

  it('leaves out anything without a valid slug and escapes what it writes', () => {
    const xml = buildBlogSitemap([{ slug: 'ok-one' }, { slug: '<script>' }, { slug: 'Bad Slug' }, null, {}]);
    expect(xml).toContain('/blogs/ok-one');
    expect(xml).not.toContain('script');
    expect(xml.match(/<url>/g)).toHaveLength(1);
  });

  it('is a valid empty sitemap when there are no articles', () => {
    expect(buildBlogSitemap([])).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n');
    expect(buildBlogSitemap(undefined)).toContain('<urlset');
  });
});
