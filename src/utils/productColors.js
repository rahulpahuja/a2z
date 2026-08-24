// Product variants: each color owns its own sizes, and each size owns its
// own stock count — colors[].sizes[].stock is the single source of truth for
// inventory. This is the one module that knows how to read/write that shape,
// including migrating older data that predates the linkage:
//   - colors as plain string[] (e.g. ['Rani Pink', 'Emerald Green'])
//   - colors as { name, hex, stock, outOfStock } with a separate top-level
//     product.sizes: [{ size, stock }] (colors and sizes were unlinked)
// Legacy products are migrated on read by fanning the product-level sizes
// out under each color, seeded with that color's old total stock — callers
// never need to know which shape a given product was saved in.

export function normalizeColorSize(sizeEntry) {
  if (!sizeEntry) return null;
  if (typeof sizeEntry === 'string') return { size: sizeEntry, stock: null };
  return {
    size: sizeEntry.size ?? '',
    stock: sizeEntry.stock === undefined || sizeEntry.stock === null ? null : sizeEntry.stock,
  };
}

function migrateLegacySizes(legacySizes, fallbackStock) {
  if (!Array.isArray(legacySizes) || legacySizes.length === 0) return [];
  return legacySizes.map((s) => ({
    size: typeof s === 'string' ? s : s.size ?? '',
    stock: fallbackStock,
  }));
}

export function normalizeColor(color, legacySizes) {
  if (!color) return null;
  if (typeof color === 'string') {
    return { name: color, hex: null, outOfStock: false, sizes: migrateLegacySizes(legacySizes, null) };
  }
  const sizes = Array.isArray(color.sizes)
    ? color.sizes.map(normalizeColorSize).filter(Boolean)
    : migrateLegacySizes(legacySizes, color.stock === undefined ? null : color.stock);
  return {
    name: color.name ?? '',
    hex: color.hex ?? null,
    outOfStock: Boolean(color.outOfStock),
    sizes,
  };
}

export function normalizeColors(colors, legacySizes) {
  return (colors ?? []).map((c) => normalizeColor(c, legacySizes)).filter(Boolean);
}

export function getColorName(color) {
  if (!color) return '';
  return typeof color === 'string' ? color : color.name ?? '';
}

// Every distinct size across all colors, in first-seen order — used to
// render the storefront's size picker before a color is chosen.
export function getAllSizeNames(colors, legacySizes) {
  const seen = new Set();
  const names = [];
  normalizeColors(colors, legacySizes).forEach((c) =>
    c.sizes.forEach((s) => {
      if (!seen.has(s.size)) {
        seen.add(s.size);
        names.push(s.size);
      }
    })
  );
  return names;
}

// null stock means untracked (always available), matching legacy behavior.
export function getColorSizeStock(color, sizeName, legacySizes) {
  const normalized = normalizeColor(color, legacySizes);
  if (!normalized) return null;
  const match = normalized.sizes.find((s) => s.size === sizeName);
  return match ? match.stock : null;
}

export function isColorOutOfStock(color, legacySizes) {
  const normalized = normalizeColor(color, legacySizes);
  if (!normalized) return false;
  if (normalized.outOfStock) return true;
  if (normalized.sizes.length === 0) return false;
  return normalized.sizes.every((s) => s.stock !== null && s.stock <= 0);
}

// Per-size stock summed across all colors — for admin/dashboard displays
// that show total stock per size rather than per (color, size) pair. A size
// is reported as null (untracked/unlimited) only if every color carrying it
// is untracked for that size.
export function getSizeStockSummary(product) {
  const colors = normalizeColors(product?.colors, product?.sizes);
  const totals = new Map();
  colors.forEach((c) => {
    c.sizes.forEach((s) => {
      const prev = totals.has(s.size) ? totals.get(s.size) : null;
      totals.set(s.size, s.stock === null ? prev : (prev ?? 0) + s.stock);
    });
  });
  return Array.from(totals, ([size, stock]) => ({ size, stock }));
}

// Sum of stock across every (color, size) pair. Returns null when stock
// isn't tracked at all (no colors, or every size is untracked) — treat null
// as "unlimited/unknown", not zero.
export function getProductTotalStock(product) {
  const summary = getSizeStockSummary(product);
  if (summary.length === 0) return null;
  if (summary.every((s) => s.stock === null)) return null;
  return summary.reduce((sum, s) => sum + (s.stock ?? 0), 0);
}

// The single source of truth for "can this product be bought right now,"
// used by every storefront listing/grid. Replaces the old ad-hoc
// `!product.outOfStock && (product.sizes?.some(s => s.stock > 0) ?? product.inStock)`
// duplicated across listing pages.
export function isProductAvailable(product) {
  if (!product || product.outOfStock) return false;
  const colors = normalizeColors(product.colors, product.sizes);
  if (colors.length === 0) return product.inStock ?? true;
  return colors.some((c) => !c.outOfStock && c.sizes.some((s) => s.stock === null || s.stock > 0));
}

// Total stock for one color across its sizes — null means untracked/unlimited.
export function getColorTotalStock(color) {
  const normalized = normalizeColor(color);
  if (!normalized || normalized.sizes.length === 0) return null;
  if (normalized.sizes.every((s) => s.stock === null)) return null;
  return normalized.sizes.reduce((sum, s) => sum + (s.stock ?? 0), 0);
}

export function isColorSizeOutOfStock(color, sizeName, legacySizes) {
  const normalized = normalizeColor(color, legacySizes);
  if (!normalized) return false;
  if (normalized.outOfStock) return true;
  const stock = getColorSizeStock(normalized, sizeName);
  return stock !== null && stock <= 0;
}
