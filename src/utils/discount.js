// Per-product discount domain logic: whether a product's discount is
// currently active, and the price it sells for as a result. Framework/
// Firebase-free (mirrors utils/coupons.js) so it can be unit tested directly
// and shared between every storefront surface that renders or charges a
// product price.
//
// Product discount fields (all optional — a product with none of these set
// simply has no discount):
//   discountUnit:         'PERCENTAGE' | 'FIXED'    (FIXED = a flat rupee amount off)
//   discountValue:        number                    (percentage points, or rupees for FIXED)
//   discountDurationType: 'FOREVER' | 'UNTIL_DATE'   (defaults to FOREVER)
//   discountEndDate:      'YYYY-MM-DD' | null        (required, and only meaningful, for UNTIL_DATE)
//   discountEndTimeMode:  'END_OF_DAY' | 'CUSTOM_TIME' (meaningful only for UNTIL_DATE; defaults to END_OF_DAY)
//   discountEndTime:      'HH:MM' | 'HH:MM:SS' | null (required, and only meaningful, when discountEndTimeMode is CUSTOM_TIME)

export const DISCOUNT_UNITS = { PERCENTAGE: 'PERCENTAGE', FIXED: 'FIXED' };

export const DISCOUNT_DURATIONS = { FOREVER: 'FOREVER', UNTIL_DATE: 'UNTIL_DATE' };

export const DISCOUNT_END_TIME_MODES = { END_OF_DAY: 'END_OF_DAY', CUSTOM_TIME: 'CUSTOM_TIME' };

function isPositiveFinite(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

// The instant a dated (UNTIL_DATE) discount lapses, or null when there's no
// valid end date to parse. Defaults to end of day (23:59:59.999, local
// time); when discountEndTimeMode is CUSTOM_TIME and a discountEndTime is
// set, that exact clock time is used instead. Shared by isDiscountActive and
// getDiscountCountdownMs so the two can never disagree on when a discount
// actually ends.
function getDiscountEndTime(product) {
  if (!product?.discountEndDate) return null;
  const useCustomTime = product.discountEndTimeMode === DISCOUNT_END_TIME_MODES.CUSTOM_TIME && product.discountEndTime;
  const timePart = useCustomTime ? product.discountEndTime : '23:59:59.999';
  const end = new Date(`${product.discountEndDate}T${timePart}`);
  return Number.isNaN(end.getTime()) ? null : end;
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
  const end = getDiscountEndTime(product);
  if (!end) return false;
  return now.getTime() <= end.getTime();
}

const COUNTDOWN_WINDOW_MS = 60 * 60 * 1000;

// Milliseconds remaining until a dated discount expires, but only once it's
// worth showing a countdown for: the discount must be active, dated (a
// FOREVER discount never shows one), and inside its final hour. Returns null
// otherwise — including once it's actually expired, at which point the
// price has simply reverted (see getDiscountedPrice) and there's nothing
// left to count down.
export function getDiscountCountdownMs(product, now = new Date()) {
  if (!isDiscountActive(product, now)) return null;
  if (product?.discountDurationType !== DISCOUNT_DURATIONS.UNTIL_DATE) return null;
  const end = getDiscountEndTime(product);
  if (!end) return null;
  const msRemaining = end.getTime() - now.getTime();
  return msRemaining > 0 && msRemaining <= COUNTDOWN_WINDOW_MS ? msRemaining : null;
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

// A short "10% OFF" / "₹100 OFF" label for an active admin-configured
// discount, or null when there isn't one (including an expired/legacy one —
// there's no unit to label a legacy originalPrice markdown with).
export function getDiscountLabel(product, now = new Date()) {
  if (!isDiscountActive(product, now)) return null;
  const value = Math.max(0, Number(product.discountValue) || 0);
  if (product.discountUnit === DISCOUNT_UNITS.FIXED) {
    return `₹${Math.round(value)} OFF`;
  }
  const percent = Math.min(100, value);
  const percentLabel = Number.isInteger(percent) ? percent : percent.toFixed(1);
  return `${percentLabel}% OFF`;
}

// Everything a price display needs in one call: the price to strike
// through, the price to actually show/charge, whether there's a discount
// worth rendering at all, and a ready-to-show label for it.
//
// Falls back to the legacy static `product.originalPrice` (used by the
// seed catalog in data/products.js, predating per-product discounts) when
// no admin-configured discount is active, so that existing "X% off" demo
// pricing keeps rendering unchanged — that fallback has no discountLabel,
// since there's no unit/value to label it with.
export function getPriceBreakdown(product, now = new Date()) {
  const price = Number(product?.price) || 0;

  if (isDiscountActive(product, now)) {
    const discountedPrice = getDiscountedPrice(product, now);
    return {
      originalPrice: price,
      discountedPrice,
      hasDiscount: discountedPrice < price,
      discountLabel: getDiscountLabel(product, now),
    };
  }

  const legacyOriginal = Number(product?.originalPrice) || 0;
  if (legacyOriginal > price) {
    return { originalPrice: legacyOriginal, discountedPrice: price, hasDiscount: true, discountLabel: null };
  }

  return { originalPrice: price, discountedPrice: price, hasDiscount: false, discountLabel: null };
}

// Validates the admin-entered discount fields before a product is saved.
// Returns an error message to show the admin, or null when the fields are
// valid — including when they're all empty, since a discount is optional.
export function validateDiscountInput({
  discountUnit,
  discountValue,
  discountDurationType,
  discountEndDate,
  discountEndTimeMode,
  discountEndTime,
}) {
  const trimmed = String(discountValue ?? '').trim();
  if (!trimmed) return null;

  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) {
    return 'Discount value must be a positive number.';
  }
  if (discountUnit === DISCOUNT_UNITS.PERCENTAGE && value > 100) {
    return 'Percentage discount cannot exceed 100%.';
  }
  if (discountDurationType === DISCOUNT_DURATIONS.UNTIL_DATE) {
    if (!discountEndDate) {
      return 'Pick an end date for the discount, or set its duration to Forever.';
    }
    if (discountEndTimeMode === DISCOUNT_END_TIME_MODES.CUSTOM_TIME && !discountEndTime) {
      return 'Pick an end time for the discount, or set it to end at the full day instead.';
    }
  }
  return null;
}
