import { descriptionToPlain } from '../utils/richText.js';
import { BRAND_NAME, NOINDEX_ROBOTS, SITE_URL } from './routes.js';

const DESCRIPTION_MAX = 160;

const truncate = (text, max) => {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};

// Head for a shared short (/shots?v=<id>) so link previews in WhatsApp, Instagram and friends show the
// product's name and photo. The page itself stays out of search results: every short lives under the
// same /shots page, and the product page is the one worth indexing.
export function buildShotHead(product, shotId) {
  const name = product.title || product.name || 'Product';
  const image = [...(product.images ?? []), product.image].find((src) => typeof src === 'string' && src.startsWith('http'));
  return {
    title: `${name} on Shots | ${BRAND_NAME}`,
    description: truncate(descriptionToPlain(product.description) || `Watch ${name} on ${BRAND_NAME} Shots.`, DESCRIPTION_MAX),
    canonical: `${SITE_URL}/shots?v=${encodeURIComponent(shotId)}`,
    robots: NOINDEX_ROBOTS,
    ogType: 'website',
    ogImage: image,
    jsonLd: [],
    noscript: '',
  };
}
