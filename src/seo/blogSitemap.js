import { SITE_URL } from './routes.js';
import { isValidSlug } from '../utils/blog/slug.js';

const escapeXml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const day = (ms) => new Date(ms).toISOString().slice(0, 10);

// The sitemap of published articles. `entries` are public index records; anything without a valid slug is
// left out so a malformed record can never put a bad URL in front of a crawler.
export function buildBlogSitemap(entries) {
  const urls = (entries ?? [])
    .filter((e) => e && isValidSlug(e.slug))
    .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0))
    .map((e) => {
      const lastmod = Number.isFinite(e.publishedAt) && e.publishedAt > 0 ? `\n    <lastmod>${day(e.publishedAt)}</lastmod>` : '';
      return `  <url>\n    <loc>${escapeXml(`${SITE_URL}/blogs/${e.slug}`)}</loc>${lastmod}\n  </url>`;
    });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}${urls.length ? '\n' : ''}</urlset>\n`;
}
