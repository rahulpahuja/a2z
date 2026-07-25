import Fuse from 'fuse.js';

// Weighted so a hit on the product's name/hashtags ranks far above an
// incidental hit buried in the description. `getFn` papers over the two
// field-naming schemes that exist in this codebase: ProductsContext.jsx
// normalizes static products to `title`/`categoryTitle`, but raw Firebase
// admin products merged directly with the static PRODUCTS array (e.g.
// AdminDashboardPage.jsx's `allProducts`) can still carry legacy
// `name`/`category` fields instead.
const SEARCH_KEYS = [
  { name: 'titleOrName', weight: 0.35, getFn: (p) => p.title || p.name || '' },
  { name: 'hashtags', weight: 0.25 },
  { name: 'categoryOrLegacy', weight: 0.12, getFn: (p) => p.categoryTitle || p.category || '' },
  { name: 'subcategoryTitle', weight: 0.08 },
  { name: 'sku', weight: 0.1 },
  { name: 'colors', weight: 0.05 },
  { name: 'id', weight: 0.05 },
  { name: 'description', weight: 0.05 },
];

const FUSE_OPTIONS = {
  keys: SEARCH_KEYS,
  includeScore: true,
  // Typo-tolerant but not "matches everything": 0 = exact, 1 = match all.
  // Fuse's own default (0.6) is too loose for a product catalog and floods
  // results with unrelated junk; 0.32 forgives 1-2 character typos/transpositions
  // on short-to-medium words (the realistic case) without doing that.
  threshold: 0.32,
  // Field values here (title, description, hashtags) can be matched
  // anywhere in the string, not just near the start — ignore location so a
  // match late in a description still scores well.
  ignoreLocation: true,
  minMatchCharLength: 2,
  shouldSort: true,
};

export function createProductSearchIndex(products) {
  return new Fuse(products ?? [], FUSE_OPTIONS);
}

// Convenience one-shot search — builds a fresh index every call, so it's
// fine for infrequent/manual lookups (admin form submit, dashboard input)
// but callers doing live/keystroke search should build their own index via
// createProductSearchIndex() once via useMemo and call index.search() directly.
export function searchProducts(products, query, limit = 8) {
  const needle = (query ?? '').trim();
  if (!needle) return [];
  return createProductSearchIndex(products)
    .search(needle, { limit })
    .map((result) => result.item);
}
