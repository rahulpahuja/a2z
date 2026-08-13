// Product colors used to be a plain string[] (e.g. ['Rani Pink', 'Emerald
// Green']). To support per-color stock and a per-color "stock out" toggle,
// each entry can now be a { name, hex, stock, outOfStock } object. `stock:
// null` means stock isn't tracked for that color (treated as always
// available, matching pre-existing behavior for products that haven't set
// it). These helpers keep every reader tolerant of both the old string shape
// and the new object shape so unmigrated Firebase/localStorage data doesn't
// break.

export function normalizeColor(color) {
  if (!color) return null;
  if (typeof color === 'string') {
    return { name: color, hex: null, stock: null, outOfStock: false };
  }
  return {
    name: color.name ?? '',
    hex: color.hex ?? null,
    stock: color.stock === undefined ? null : color.stock,
    outOfStock: Boolean(color.outOfStock),
  };
}

export function normalizeColors(colors) {
  return (colors ?? []).map(normalizeColor).filter(Boolean);
}

export function getColorName(color) {
  if (!color) return '';
  return typeof color === 'string' ? color : color.name ?? '';
}

export function isColorOutOfStock(color) {
  const normalized = normalizeColor(color);
  if (!normalized) return false;
  if (normalized.outOfStock) return true;
  return normalized.stock !== null && normalized.stock <= 0;
}
