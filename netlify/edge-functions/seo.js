// Serves each page's real <title>, meta, canonical and JSON-LD in the HTML response,
// so crawlers that don't run JavaScript index the same content users see. The
// decisions (what a route's head is, what a product's head is) live in src/seo/ and
// are unit tested there; this file only fetches data and rewrites the response.
import { normalizePath, notFoundHead, resolveRouteSeo } from '../../src/seo/routes.js';
import { applyPageMeta, pageMetaKey } from '../../src/seo/pageMeta.js';
import { buildProductHead } from '../../src/seo/productHead.js';
import { injectHeadIntoHtml } from '../../src/seo/head.js';
import { buildCollectionHead } from '../../src/seo/collectionHead.js';

export const config = { path: '/*', excludedPath: ['/assets/*', '/*.*'] };

const PRODUCT_PATH = /^\/products\/([^/]+)\/?$/;
const COLLECTION_PATH = /^\/collections\/([^/]+)\/?$/;

async function readRtdb(databaseUrl, path) {
  const res = await fetch(`${databaseUrl}/${path}.json`);
  if (!res.ok) throw new Error(`RTDB read of ${path} failed with status ${res.status}`);
  return res.json();
}

// A product that isn't in Firebase is a real 404. Other failures throw, so the
// caller can fall back to serving the page without a product-specific head.
async function resolveProductHead(databaseUrl, id) {
  const key = encodeURIComponent(id);
  const [product, faqsRaw, reviewsRaw] = await Promise.all([
    readRtdb(databaseUrl, `adminProducts/${key}`),
    readRtdb(databaseUrl, `productFaqs/${key}`),
    readRtdb(databaseUrl, `productReviews/${key}`),
  ]);
  if (!product) return { status: 404, head: notFoundHead() };
  const faqs = Array.isArray(faqsRaw) ? faqsRaw : Object.values(faqsRaw ?? {});
  const reviews = Object.entries(reviewsRaw ?? {}).map(([reviewId, row]) => ({ id: reviewId, ...row }));
  return { status: 200, head: buildProductHead({ id, ...product }, { faqs, reviews }) };
}

// An unpublished or missing collection is a real 404. Without its own cover, the
// thumbnail product's photo stands in, as on the page.
async function resolveCollectionHead(databaseUrl, id) {
  const collection = await readRtdb(databaseUrl, `collections/${encodeURIComponent(id)}`);
  if (!collection || !collection.published) return { status: 404, head: notFoundHead() };
  let image = collection.coverImage;
  if (!image) {
    const productId = collection.heroProductId || Object.values(collection.productIds ?? {})[0];
    const product = productId ? await readRtdb(databaseUrl, `adminProducts/${encodeURIComponent(productId)}`) : null;
    image = product?.images?.[0] || product?.image;
  }
  return { status: 200, head: buildCollectionHead({ id, ...collection }, { image }) };
}

export default async function seo(request, context) {
  const { pathname } = new URL(request.url);
  const response = await context.next();
  const databaseUrl = Deno.env.get('VITE_FIREBASE_DATABASE_URL');
  const productMatch = pathname.match(PRODUCT_PATH);
  const collectionMatch = pathname.match(COLLECTION_PATH);

  let status = response.status;
  let head = null;
  if (productMatch) {
    if (databaseUrl) {
      try {
        ({ status, head } = await resolveProductHead(databaseUrl, decodeURIComponent(productMatch[1])));
      } catch (err) {
        console.error('seo: product lookup failed, serving shell', err);
      }
    }
  } else if (collectionMatch) {
    if (databaseUrl) {
      try {
        ({ status, head } = await resolveCollectionHead(databaseUrl, decodeURIComponent(collectionMatch[1])));
      } catch (err) {
        console.error('seo: collection lookup failed, serving shell', err);
      }
    }
  } else {
    ({ status, head } = resolveRouteSeo(pathname));
    if (status === 200 && databaseUrl) {
      try {
        const entry = await readRtdb(databaseUrl, `settings/pageMeta/${pageMetaKey(normalizePath(pathname))}`);
        head = applyPageMeta(head, entry);
      } catch (err) {
        console.error('seo: page meta lookup failed, serving default head', err);
      }
    }
  }

  const html = injectHeadIntoHtml(await response.text(), head);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'public, max-age=0, s-maxage=300');
  return new Response(html, { status, headers });
}
