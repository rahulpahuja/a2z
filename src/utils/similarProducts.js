// "You may also like": the k nearest neighbours of a product in a small feature space.
//
// Each product is described by its category and subcategory, gender, price, colours, hashtags and the words in
// its name. The distance between two products is a weighted sum of how much those differ (0 = identical,
// 1 = nothing in common per feature); the k products with the smallest distance are the recommendation. Products
// that cannot be bought right now are only used to fill up the list once every available product is in.
import { isProductAvailable } from './productColors.js';

export const DEFAULT_K = 12;

// Relative importance of each feature. Category matters most, then what the product is called and its price.
const WEIGHTS = { category: 3, subcategory: 2, gender: 1.5, price: 2, colors: 1, tags: 1.5, name: 2 };
const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'in', 'of', 'a', 'an', 'to', 'print', 'printed']);

const text = (value) => String(value ?? '').trim().toLowerCase();

function words(value) {
  return text(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function colourNames(product) {
  const fromColors = (product.colors ?? []).map((c) => (typeof c === 'string' ? c : c?.name));
  return new Set([...fromColors, ...(product.imageColors ?? [])].map(text).filter(Boolean));
}

// The numbers a product is compared on, worked out once per product.
export function describeProduct(product) {
  return {
    id: String(product.id),
    category: text(product.categoryId || product.category),
    subcategory: text(product.subcategoryId || product.subcategoryTitle),
    gender: text(product.gender) || 'unisex',
    logPrice: Math.log1p(Math.max(0, Number(product.price) || 0)),
    colors: colourNames(product),
    tags: new Set((product.hashtags ?? []).map((t) => text(t).replace(/^#/, '')).filter(Boolean)),
    name: new Set(words(product.name || product.title)),
  };
}

// 0 when the sets are identical, 1 when they share nothing. Two empty sets say nothing either way (0.5).
function setDistance(a, b) {
  if (a.size === 0 && b.size === 0) return 0.5;
  let shared = 0;
  for (const item of a) if (b.has(item)) shared += 1;
  return 1 - shared / (a.size + b.size - shared);
}

// A missing value on either side is "unknown" (0.5), not a mismatch.
const labelDistance = (a, b) => (!a || !b ? 0.5 : a === b ? 0 : 1);

function genderDistance(a, b) {
  if (a === b) return 0;
  return a === 'unisex' || b === 'unisex' ? 0.5 : 1;
}

export function productDistance(a, b, priceSpread) {
  return (
    WEIGHTS.category * labelDistance(a.category, b.category) +
    WEIGHTS.subcategory * labelDistance(a.subcategory, b.subcategory) +
    WEIGHTS.gender * genderDistance(a.gender, b.gender) +
    WEIGHTS.price * Math.min(1, Math.abs(a.logPrice - b.logPrice) / priceSpread) +
    WEIGHTS.colors * setDistance(a.colors, b.colors) +
    WEIGHTS.tags * setDistance(a.tags, b.tags) +
    WEIGHTS.name * setDistance(a.name, b.name)
  );
}

// The `k` products most like `target`, nearest first. Ties go to the lower id so the list never reshuffles.
export function findSimilarProducts(target, products, k = DEFAULT_K) {
  if (!target || !Array.isArray(products) || k <= 0) return [];
  const others = products.filter((p) => p && String(p.id) !== String(target.id));
  if (others.length === 0) return [];

  const from = describeProduct(target);
  const described = others.map((product) => ({ product, features: describeProduct(product) }));
  // Price differences are judged against how wide the catalogue's prices are, so they weigh the same in a cheap
  // and in an expensive shop.
  const prices = [from.logPrice, ...described.map((d) => d.features.logPrice)];
  const priceSpread = Math.max(0.01, Math.max(...prices) - Math.min(...prices));

  return described
    .map(({ product, features }) => ({ product, distance: productDistance(from, features, priceSpread), available: isProductAvailable(product) }))
    .sort((a, b) => Number(b.available) - Number(a.available) || a.distance - b.distance || String(a.product.id).localeCompare(String(b.product.id)))
    .slice(0, k)
    .map((entry) => entry.product);
}
