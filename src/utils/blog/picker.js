import { isProductAvailable } from '../productColors.js';
import { getDiscountedPrice } from '../discount.js';
import { getBlogType } from './types.js';
import { moveItem } from '../homeLayout.js';

// Pure logic behind the product/collection picker in the article editor, kept out of the component so
// the rules (what matches a search, what a collection adds, how limits apply) are unit tested.

const lower = (value) => String(value ?? '').toLowerCase();

// Search matches name, id and SKU; filters narrow by category, collection, availability and price.
export function filterProducts(products, { query = '', category = '', collection = null, availability = 'all', minPrice = '', maxPrice = '' } = {}) {
  const terms = lower(query).split(/\s+/).filter(Boolean);
  const members = collection ? new Set((collection.productIds ?? []).map(String)) : null;
  const min = minPrice === '' ? null : Number(minPrice);
  const max = maxPrice === '' ? null : Number(maxPrice);
  return (products ?? []).filter((p) => {
    if (members && !members.has(String(p.id))) return false;
    if (category && (p.categoryTitle || p.category) !== category) return false;
    const available = isProductAvailable(p);
    if (availability === 'in' && !available) return false;
    if (availability === 'out' && available) return false;
    const price = getDiscountedPrice(p);
    if (Number.isFinite(min) && min !== null && price < min) return false;
    if (Number.isFinite(max) && max !== null && price > max) return false;
    if (!terms.length) return true;
    const haystack = lower(`${p.name} ${p.title} ${p.id} ${p.sku} ${p.categoryTitle} ${p.category}`);
    return terms.every((t) => haystack.includes(t));
  });
}

export const categoriesOf = (products) =>
  [...new Set((products ?? []).map((p) => p.categoryTitle || p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));

export function productLimit(type) {
  return getBlogType(type).products.max;
}

// Adds `id` unless it is already there or the limit is reached. Returns the same array when nothing changes.
export function addProductId(ids, id, limit) {
  const clean = String(id);
  if (ids.includes(clean) || ids.length >= limit) return ids;
  return [...ids, clean];
}

export function removeProductId(ids, id) {
  return ids.filter((x) => x !== String(id));
}

// Moves a product within the selected list; a no-op at the ends.
export function moveProductId(ids, id, delta) {
  const from = ids.indexOf(String(id));
  const to = from + delta;
  if (from === -1 || to < 0 || to >= ids.length) return ids;
  return moveItem(ids, from, to);
}

// Selecting a collection links it and adds its products that still exist, up to the limit; the
// author can then remove or add individual products. The first collection becomes the primary one.
export function applyCollection(value, collection, catalogue, limit) {
  const collectionIds = value.collectionIds.includes(collection.id) ? value.collectionIds : [...value.collectionIds, collection.id];
  const live = new Set((catalogue ?? []).map((p) => String(p.id)));
  let productIds = value.productIds;
  let skipped = 0;
  for (const id of collection.productIds ?? []) {
    if (!live.has(String(id)) || productIds.includes(String(id))) continue;
    const next = addProductId(productIds, id, limit);
    if (next === productIds) skipped += 1;
    productIds = next;
  }
  return {
    value: { ...value, collectionIds, productIds, primaryCollectionId: value.primaryCollectionId || collection.id },
    skipped,
  };
}

// Removing a collection unlinks it but leaves the products the author kept.
export function removeCollection(value, collectionId) {
  const collectionIds = value.collectionIds.filter((id) => id !== collectionId);
  return { ...value, collectionIds, primaryCollectionId: value.primaryCollectionId === collectionId ? collectionIds[0] ?? '' : value.primaryCollectionId };
}

// Keeps the hero product valid after the selection changes.
export function reconcileHero(value) {
  return value.heroProductId && !value.productIds.includes(value.heroProductId) ? { ...value, heroProductId: '' } : value;
}
