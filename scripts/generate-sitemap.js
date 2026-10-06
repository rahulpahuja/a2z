// Regenerates public/sitemap.xml and public/llms.txt before every build (wired in as an npm
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const OUTPUT_PATH = path.join(REPO_ROOT, 'public', 'sitemap.xml');
const LLMS_OUTPUT_PATH = path.join(REPO_ROOT, 'public', 'llms.txt');
const SITE_URL = 'https://www.thea2zcollection.com';
// Matches the description in index.html so AI assistants describe the brand the same way search does.
const LLMS_SUMMARY =
  'A2Z Collection is a fashion brand rooted in Indore, Madhya Pradesh, selling traditional Indian craftsmanship made for the modern wardrobe, with delivery across India.';

// Every real, indexable page that isn't a product detail page — kept in
// sync manually with src/App.jsx's ROUTES. Deliberately excludes anything
// transactional/account-specific (cart, checkout, orders, profile),
// admin/dashboard routes (already disallowed in robots.txt), and orphaned
// design pages that nothing links to (/storefront, /product-alt,
// /watch-and-buy).
const STATIC_PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/products', changefreq: 'daily', priority: '0.9' },
  { path: '/shots', changefreq: 'weekly', priority: '0.6' },
  { path: '/about-us', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact-us', changefreq: 'monthly', priority: '0.6' },
  { path: '/a2z-stores', changefreq: 'monthly', priority: '0.5' },
  { path: '/store-appointment', changefreq: 'monthly', priority: '0.5' },
  { path: '/faqs', changefreq: 'monthly', priority: '0.5' },
  { path: '/size-chart', changefreq: 'monthly', priority: '0.4' },
  { path: '/careers', changefreq: 'monthly', priority: '0.4' },
  { path: '/feedback', changefreq: 'monthly', priority: '0.3' },
  { path: '/terms-and-conditions', changefreq: 'yearly', priority: '0.3' },
  { path: '/shipping-policy', changefreq: 'yearly', priority: '0.3' },
  { path: '/return-exchange-policy', changefreq: 'yearly', priority: '0.3' },
  { path: '/refund-policy', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy-policy', changefreq: 'yearly', priority: '0.3' },
];

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

async function fetchFaqsByProduct(databaseUrl) {
  const res = await fetch(`${databaseUrl}/productFaqs.json`);
  if (!res.ok) return {};
  return (await res.json()) ?? {};
}

async function fetchProducts(databaseUrl) {
  const res = await fetch(`${databaseUrl}/adminProducts.json`);
  if (!res.ok) throw new Error(`Firebase REST read failed with status ${res.status}`);
  const data = await res.json();
  if (!data) return [];
  return Object.entries(data).map(([id, product]) => ({ id, ...product }));
}

// Plain-text, one-line-per-fact format so crawlers that don't run JavaScript can
// read product names, descriptions and FAQs. Prices are deliberately omitted:
// discounts change them, so a static file would go stale.
const singleLine = (text) => String(text ?? '').replace(/\s+/g, ' ').trim();

function buildLlmsTxt(products, faqsByProduct) {
  const productLines = products
    .filter((product) => product.title || product.name)
    .sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name))
    .map((product) => {
      const name = singleLine(product.title || product.name);
      const url = `${SITE_URL}/products/${encodeURIComponent(product.id)}`;
      const category = singleLine(product.categoryTitle || product.category);
      const description = singleLine(product.description);
      const faqs = Object.values(faqsByProduct[product.id] ?? {}).filter((faq) => faq?.question && faq?.answer);
      return [
        `### [${name}](${url})`,
        category && `Category: ${category}`,
        description && `Description: ${description}`,
        ...faqs.map((faq) => `Q: ${singleLine(faq.question)}\nA: ${singleLine(faq.answer)}`),
      ]
        .filter(Boolean)
        .join('\n');
    });

  return [
    '# A2Z Collection',
    '',
    `> ${LLMS_SUMMARY}`,
    '',
    '## Store pages',
    `- [Shop all products](${SITE_URL}/products): Full catalogue of A2Z Collection apparel`,
    `- [About us](${SITE_URL}/about-us): Who we are`,
    `- [Store locations](${SITE_URL}/a2z-stores): A2Z Collection stores`,
    `- [Size chart](${SITE_URL}/size-chart): Sizing guide`,
    `- [FAQs](${SITE_URL}/faqs): Common questions about orders, shipping and policies`,
    `- [Contact us](${SITE_URL}/contact-us): How to reach the team`,
    '',
    '## Policies',
    `- [Shipping policy](${SITE_URL}/shipping-policy)`,
    `- [Return and exchange policy](${SITE_URL}/return-exchange-policy)`,
    `- [Refund policy](${SITE_URL}/refund-policy)`,
    `- [Privacy policy](${SITE_URL}/privacy-policy)`,
    `- [Terms and conditions](${SITE_URL}/terms-and-conditions)`,
    '',
    '## Products',
    ...productLines,
    '',
  ].join('\n');
}

function urlEntry(loc, { lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    lastmod && `    <lastmod>${lastmod}</lastmod>`,
    changefreq && `    <changefreq>${changefreq}</changefreq>`,
    priority && `    <priority>${priority}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

async function main() {
  const today = toDateStamp();
  const entries = STATIC_PAGES.map((page) =>
    urlEntry(`${SITE_URL}${page.path}`, { lastmod: today, changefreq: page.changefreq, priority: page.priority })
  );

  const databaseUrl = await resolveDatabaseUrl();
  if (!databaseUrl) {
    console.warn('generate-sitemap: VITE_FIREBASE_DATABASE_URL not set — writing static pages only.');
  } else {
    const products = await fetchProducts(databaseUrl);
    const faqsByProduct = await fetchFaqsByProduct(databaseUrl);
    await writeFile(LLMS_OUTPUT_PATH, buildLlmsTxt(products, faqsByProduct), 'utf8');
    console.log(`generate-sitemap: wrote ${path.relative(REPO_ROOT, LLMS_OUTPUT_PATH)}.`);
    for (const product of products) {
      entries.push(
        urlEntry(`${SITE_URL}/products/${encodeURIComponent(product.id)}`, {
          lastmod: toDateStamp(product.updatedAtMs ?? product.createdAtMs),
          changefreq: 'weekly',
          priority: '0.7',
        })
      );
    }
    console.log(`generate-sitemap: included ${products.length} product page(s).`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
  await writeFile(OUTPUT_PATH, xml, 'utf8');
  console.log(`generate-sitemap: wrote ${entries.length} URL(s) to ${path.relative(REPO_ROOT, OUTPUT_PATH)}.`);
}

main().catch((err) => {
  console.warn(`generate-sitemap: generation failed (${err.message}) — keeping existing public/sitemap.xml.`);
});
