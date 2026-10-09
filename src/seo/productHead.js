import { getPriceBreakdown } from '../utils/discount.js';
import { isColorOutOfStock, normalizeColors } from '../utils/productColors.js';
import { summarizeReviews } from '../utils/reviewStats.js';
import { BRAND_NAME, DEFAULT_ROBOTS, SITE_URL } from './routes.js';

const DESCRIPTION_MAX = 160;
const REVIEW_SNIPPETS = 5;

const truncate = (text, max) => {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  // Cut at a word boundary so the snippet never ends mid-word.
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};

const isoDate = (ms) => (ms ? new Date(ms).toISOString() : undefined);

// Most-helpful first, matching the default sort on the product page, so the reviews
// in the structured data are the ones a visitor sees first.
const topReviews = (reviews) =>
  [...reviews]
    .sort((a, b) => (b.helpful ?? 0) - (a.helpful ?? 0))
    .slice(0, REVIEW_SNIPPETS);

// Builds the head, JSON-LD and crawlable body for a product page. Every value is
// derived from data the page shows, so the structured data doesn't claim anything
// the visitor can't see.
export function buildProductHead(product, { faqs = [], reviews = [], now = new Date() } = {}) {
  const name = product.title || product.name || 'Product';
  const url = `${SITE_URL}/products/${encodeURIComponent(product.id)}`;
  const { discountedPrice } = getPriceBreakdown(product, now);
  const colors = normalizeColors(product.colors, product.sizes);
  const inStock = !product.outOfStock && (colors.length === 0 || colors.some((c) => !isColorOutOfStock(c)));
  const description = truncate(product.description || `Shop ${name} from ${BRAND_NAME}.`, DESCRIPTION_MAX);
  const images = [...new Set([...(product.images ?? []), product.image].filter((src) => typeof src === 'string' && src.startsWith('http')))];
  const image = images[0];
  const summary = summarizeReviews(reviews);

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    url,
    brand: { '@type': 'Brand', name: BRAND_NAME },
    category: product.categoryTitle || product.category || undefined,
    sku: product.sku || undefined,
    ...(images.length > 0 ? { image: images } : {}),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price: Math.round(discountedPrice),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: BRAND_NAME },
    },
  };

  if (summary.count > 0) {
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round(summary.average * 10) / 10,
      reviewCount: summary.count,
      bestRating: 5,
      worstRating: 1,
    };
    productSchema.review = topReviews(reviews).map((review) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: review.name },
      datePublished: isoDate(review.createdAtMs),
      reviewBody: review.body,
      reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 5, worstRating: 1 },
    }));
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products` },
      { '@type': 'ListItem', position: 3, name, item: url },
    ],
  };

  const jsonLd = [productSchema, breadcrumbSchema];
  if (faqs.length > 0) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    });
  }

  return {
    title: `${name} | ${BRAND_NAME}`,
    description,
    canonical: url,
    robots: DEFAULT_ROBOTS,
    ogType: 'product',
    ogImage: image,
    jsonLd,
    noscript: productNoscript({ name, description, faqs, price: Math.round(discountedPrice) }),
  };
}

// Crawlable copy for clients without JavaScript. Mirrors what the page renders.
function productNoscript({ name, description, faqs, price }) {
  const esc = (text) =>
    String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const faqHtml = faqs.length
    ? `<h2>Frequently Asked Questions</h2>${faqs.map((faq) => `<h3>${esc(faq.question)}</h3><p>${esc(faq.answer)}</p>`).join('')}`
    : '';
  return `<article><h1>${esc(name)}</h1><p>₹${price.toLocaleString('en-IN')}</p><p>${esc(description)}</p>${faqHtml}</article>`;
}
