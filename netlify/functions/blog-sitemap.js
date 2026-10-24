// Sitemap of published blog articles, served at /blog-sitemap.xml (see netlify.toml). Generated on request from
// the public index, so a newly published or scheduled article appears without a rebuild.
import { buildBlogSitemap } from '../../src/seo/blogSitemap.js';

export const handler = async () => {
  const base = process.env.VITE_FIREBASE_DATABASE_URL;
  let entries = [];
  try {
    if (base) {
      const res = await fetch(`${base.replace(/\/$/, '')}/blogs/index.json`);
      if (res.ok) entries = Object.values((await res.json()) ?? {});
    }
  } catch (error) {
    console.error('blog-sitemap: could not read the index', error?.message);
  }
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300, s-maxage=600' },
    body: buildBlogSitemap(entries),
  };
};
