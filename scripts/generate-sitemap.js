// Regenerates public/sitemap.xml before every build (wired in as an npm
// "prebuild" hook — see package.json). Merges the fixed list of static
// marketing/content pages below with one <url> per live product, fetched
// straight from Firebase: adminProducts is publicly readable
// (database.rules.json), so a plain REST GET is enough here — no Admin SDK
// or service account needed.
//
// Never fails the build: any error (missing/unreachable database, bad
// response) is logged and swallowed, leaving whatever public/sitemap.xml
// already exists (the static-only version checked into git, or the last
// successful generation) in place.
import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { listIndexableRoutes } from '../src/seo/routes.js';
import { hasNoindex, pageMetaKey } from '../src/seo/pageMeta.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const OUTPUT_PATH = path.join(REPO_ROOT, 'public', 'sitemap.xml');
const SITE_URL = 'https://www.thea2zcollection.com';

// Static pages come from the same route table the SEO head uses
// (src/seo/routes.js), so the sitemap can't drift from what the site marks as
// indexable. They carry no <lastmod>: nothing records when their copy changed, and
// Google ignores a lastmod that doesn't track real edits (as it does
// <changefreq> and <priority>, which are omitted for the same reason).

function toDateStamp(ms) {
  return new Date(ms ?? Date.now()).toISOString().slice(0, 10);
}

// Netlify build environments expose configured env vars directly on
// process.env regardless of the VITE_ prefix, so production builds need
// nothing extra. Local builds fall back to reading .env directly, since a
// plain Node script (unlike Vite itself) doesn't load it automatically.
async function resolveDatabaseUrl() {
  if (process.env.VITE_FIREBASE_DATABASE_URL) return process.env.VITE_FIREBASE_DATABASE_URL;
  try {
    const raw = await readFile(path.join(REPO_ROOT, '.env'), 'utf8');
    return raw.match(/^VITE_FIREBASE_DATABASE_URL=(.*)$/m)?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

async function fetchProducts(databaseUrl) {
  const res = await fetch(`${databaseUrl}/adminProducts.json`);
  if (!res.ok) throw new Error(`Firebase REST read failed with status ${res.status}`);
  const data = await res.json();
  if (!data) return [];
  return Object.entries(data).map(([id, product]) => ({ id, ...product }));
}

const escapeXml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Admin "Page SEO" can mark a page noindex; keep those out of the sitemap.
async function fetchNoindexedPaths(databaseUrl) {
  const res = await fetch(`${databaseUrl}/settings/pageMeta.json`);
  if (!res.ok) throw new Error(`Firebase REST read failed with status ${res.status}`);
  const overrides = (await res.json()) ?? {};
  return new Set(listIndexableRoutes().filter(({ path: route }) => hasNoindex(overrides[pageMetaKey(route)])).map(({ path: route }) => route));
}

async function fetchPublishedCollections(databaseUrl) {
  const res = await fetch(`${databaseUrl}/collections.json`);
  if (!res.ok) throw new Error(`Firebase REST read failed with status ${res.status}`);
  const data = (await res.json()) ?? {};
  return Object.entries(data)
    .map(([id, collection]) => ({ id, ...collection }))
    .filter((collection) => collection.published && Object.keys(collection.productIds ?? {}).length > 0);
}

function urlEntry(loc, { lastmod, images = [] } = {}) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod && `    <lastmod>${lastmod}</lastmod>`,
    ...images.map((src) => `    <image:image><image:loc>${escapeXml(src)}</image:loc></image:image>`),
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

async function main() {
  const databaseUrl = await resolveDatabaseUrl();
  if (!databaseUrl) console.warn('generate-sitemap: VITE_FIREBASE_DATABASE_URL not set — writing static pages only.');

  const noindexed = databaseUrl ? await fetchNoindexedPaths(databaseUrl).catch(() => new Set()) : new Set();
  const entries = listIndexableRoutes()
    .filter(({ path: route }) => !noindexed.has(route))
    .map(({ path: route }) => urlEntry(`${SITE_URL}${route}`));

  if (databaseUrl) {
    const products = await fetchProducts(databaseUrl);
    for (const product of products) {
      const images = [...new Set([...(product.images ?? []), product.image].filter((src) => typeof src === 'string' && src.startsWith('http')))];
      entries.push(
        urlEntry(`${SITE_URL}/products/${encodeURIComponent(product.id)}`, {
          lastmod: toDateStamp(product.updatedAtMs ?? product.createdAtMs),
          images,
        })
      );
    }
    console.log(`generate-sitemap: included ${products.length} product page(s).`);

    // Collapsed or not, a published collection has its own page worth indexing.
    const collections = await fetchPublishedCollections(databaseUrl).catch(() => []);
    for (const collection of collections) {
      entries.push(urlEntry(`${SITE_URL}/collections/${encodeURIComponent(collection.id)}`, { images: collection.coverImage ? [collection.coverImage] : [] }));
    }
    console.log(`generate-sitemap: included ${collections.length} collection page(s).`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.join('\n')}\n</urlset>\n`;
  await writeFile(OUTPUT_PATH, xml, 'utf8');
  console.log(`generate-sitemap: wrote ${entries.length} URL(s) to ${path.relative(REPO_ROOT, OUTPUT_PATH)}.`);
}

main().catch((err) => {
  console.warn(`generate-sitemap: generation failed (${err.message}) — keeping existing public/sitemap.xml.`);
});
