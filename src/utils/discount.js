// Per-product discount domain logic: whether a product's discount is
// currently active, and the price it sells for as a result. Framework/
// Firebase-free (mirrors utils/coupons.js) so it can be unit tested directly
// and shared between every storefront surface that renders or charges a
// product price.
//
// Product discount fields (all optional — a product with none of these set
// simply has no discount):
//   discountUnit:        'PERCENTAGE' | 'FIXED'   (FIXED = a flat rupee amount off)
//   discountValue:       number                   (percentage points, or rupees for FIXED)
//   discountDurationType: 'FOREVER' | 'UNTIL_DATE' (defaults to FOREVER)
//   discountEndDate:     'YYYY-MM-DD' | null       (required, and only meaningful, for UNTIL_DATE)

export const DISCOUNT_UNITS = { PERCENTAGE: 'PERCENTAGE', FIXED: 'FIXED' };

export const DISCOUNT_DURATIONS = { FOREVER: 'FOREVER', UNTIL_DATE: 'UNTIL_DATE' };

function isPositiveFinite(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

// True when `product`'s configured discount is currently in effect: a
// positive discount value, and — for a dated discount — not yet past its end
// date. `now` is injectable so callers and tests don't depend on wall-clock
// time. A duration type of 'UNTIL_DATE' with no end date set is treated as
// not active rather than forever, since that combination can only arise from
// an incomplete/invalid save.
export function isDiscountActive(product, now = new Date()) {
  const value = Number(product?.discountValue);
  if (!isPositiveFinite(value)) return false;
  if (product?.discountDurationType !== DISCOUNT_DURATIONS.UNTIL_DATE) return true;
  if (!product.discountEndDate) return false;
  const end = new Date(`${product.discountEndDate}T23:59:59.999`);
  if (Number.isNaN(end.getTime())) return false;
  return now.getTime() <= end.getTime();
}

// The product's price after any currently-active discount is applied.
// Percentage values are clamped to [0, 100] and the result is never allowed
// to go below 0, so a bad/legacy stored value degrades gracefully instead of
// producing a negative or absurd price.
export function getDiscountedPrice(product, now = new Date()) {
  const price = Number(product?.price) || 0;
  if (!isDiscountActive(product, now)) return price;

  const value = Math.max(0, Number(product.discountValue) || 0);
  if (product.discountUnit === DISCOUNT_UNITS.FIXED) {
    return Math.max(0, Math.round(price - value));
  }
  const percent = Math.min(100, value);
  return Math.max(0, Math.round(price - (price * percent) / 100));
}

// Everything a price display needs in one call: the price to strike
// through, the price to actually show/charge, and whether there's a
// discount worth rendering at all.
//
// Falls back to the legacy static `product.originalPrice` (used by the
// seed catalog in data/products.js, predating per-product discounts) when
// no admin-configured discount is active, so that existing "X% off" demo
// pricing keeps rendering unchanged.
export function getPriceBreakdown(product, now = new Date()) {
  const price = Number(product?.price) || 0;

  if (isDiscountActive(product, now)) {
    const discountedPrice = getDiscountedPrice(product, now);
    return { originalPrice: price, discountedPrice, hasDiscount: discountedPrice < price };
  }

  const legacyOriginal = Number(product?.originalPrice) || 0;
  if (legacyOriginal > price) {
    return { originalPrice: legacyOriginal, discountedPrice: price, hasDiscount: true };
  }

  return { originalPrice: price, discountedPrice: price, hasDiscount: false };
}

// Validates the admin-entered discount fields before a product is saved.
// Returns an error message to show the admin, or null when the fields are
// valid — including when they're all empty, since a discount is optional.
export function validateDiscountInput({ discountUnit, discountValue, discountDurationType, discountEndDate }) {
  const trimmed = String(discountValue ?? '').trim();
  if (!trimmed) return null;

  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) {
    return 'Discount value must be a positive number.';
  }
  if (discountUnit === DISCOUNT_UNITS.PERCENTAGE && value > 100) {
    return 'Percentage discount cannot exceed 100%.';
  }
  if (discountDurationType === DISCOUNT_DURATIONS.UNTIL_DATE && !discountEndDate) {
    return 'Pick an end date for the discount, or set its duration to Forever.';
  }
  return null;
}
