// Coupon domain logic: discount math, eligibility, status derivation and
// atomic usage-counter transitions. Kept framework/Firebase-free so it can be
// unit tested directly and shared between the Firebase transaction callback
// (services/coupons.js) and the local/no-Firebase simulation it falls back to.

export const DISCOUNT_TYPES = { PERCENTAGE: 'PERCENTAGE', FIXED: 'FIXED' };

export const TARGET_TYPES = { ALL: 'ALL', PRODUCTS: 'PRODUCTS', CATEGORY: 'CATEGORY', SUBCATEGORY: 'SUBCATEGORY' };

export const COUPON_STATUS = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
  EXPIRED: 'EXPIRED',
  USAGE_LIMIT_REACHED: 'USAGE_LIMIT_REACHED',
};

// Firebase Realtime Database keys can't contain '.', '$', '#', '[', ']', '/'.
// Customer ids (phone-based msg91 uids, Firebase Auth uids) shouldn't hit
// this in practice, but sanitize defensively before using one as a key.
export function sanitizeCustomerKey(customerId) {
  return String(customerId).replace(/[.$#[\]/]/g, '_');
}

export function normalizeCouponCode(code) {
  return String(code || '').trim().toUpperCase();
}

// The line total eligible for this coupon's discount — the whole cart for an
// ALL-products coupon, or only the lines matching its target for a
// product/category/subcategory-scoped one.
export function computeEligibleAmount(coupon, items) {
  const lineTotal = (item) => item.price * item.quantity;
  if (!coupon || !coupon.targetType || coupon.targetType === TARGET_TYPES.ALL) {
    return (items || []).reduce((sum, item) => sum + lineTotal(item), 0);
  }
  const ids = new Set(coupon.targetIds || []);
  return (items || []).reduce((sum, item) => {
    const matches =
      (coupon.targetType === TARGET_TYPES.PRODUCTS && ids.has(item.productId ?? item.id)) ||
      (coupon.targetType === TARGET_TYPES.CATEGORY && item.categoryId && ids.has(item.categoryId)) ||
      (coupon.targetType === TARGET_TYPES.SUBCATEGORY && item.subcategoryId && ids.has(item.subcategoryId));
    return matches ? sum + lineTotal(item) : sum;
  }, 0);
}

// percentageDiscount = eligibleAmount * discountValue / 100, capped at
// maximumDiscountAmount when set; fixed discount is just discountValue.
// Either way the result never exceeds the eligible amount itself.
export function calculateDiscount(coupon, eligibleAmount) {
  if (!coupon || !(eligibleAmount > 0)) return 0;
  let discount;
  if (coupon.discountType === DISCOUNT_TYPES.FIXED) {
    discount = coupon.discountValue;
  } else {
    discount = (eligibleAmount * coupon.discountValue) / 100;
    if (coupon.maximumDiscountAmount != null) {
      discount = Math.min(discount, coupon.maximumDiscountAmount);
    }
  }
  return Math.min(Math.max(discount, 0), eligibleAmount);
}

// "50% OFF up to ₹100" / "50% OFF" / "₹100 OFF" — the only string a coupon's
// discount should ever be summarized as; never show a bare "X% OFF" when a
// cap applies, since that misrepresents the actual maximum discount.
export function formatCouponBadge(coupon) {
  if (!coupon) return '';
  if (coupon.discountType === DISCOUNT_TYPES.FIXED) {
    return `₹${coupon.discountValue} OFF`;
  }
  const base = `${coupon.discountValue}% OFF`;
  return coupon.maximumDiscountAmount != null ? `${base} up to ₹${coupon.maximumDiscountAmount}` : base;
}

// Derived, not stored: DISABLED (manual) always wins, then the date/usage
// window. A coupon without both dates set yet is a DRAFT that was never
// scheduled.
export function getCouponStatus(coupon, now = new Date()) {
  if (!coupon) return null;
  if (coupon.isActive === false) return COUPON_STATUS.DISABLED;
  if (!coupon.startAt || !coupon.endAt) return COUPON_STATUS.DRAFT;
  const nowMs = now.getTime();
  const startMs = new Date(coupon.startAt).getTime();
  const endMs = new Date(coupon.endAt).getTime();
  if (nowMs >= endMs) return COUPON_STATUS.EXPIRED;
  if (nowMs < startMs) return COUPON_STATUS.SCHEDULED;
  if (coupon.usageLimit != null && (coupon.usageCount ?? 0) >= coupon.usageLimit) {
    return COUPON_STATUS.USAGE_LIMIT_REACHED;
  }
  return COUPON_STATUS.ACTIVE;
}

// Pure state transition for consuming one use of a coupon: validates the
// status/date/usage-limit/per-customer-limit gates against the given
// snapshot and, if they pass, returns the incremented record. This is the
// function run inside the Firebase transaction (and its local-mode
// equivalent) so every caller — real or simulated — checks the exact same
// rules against the exact same atomic read. Returns { ok: false, code,
// message } without mutating anything when any gate fails.
export function reserveCouponUsageOnData(coupon, { customerId, now = new Date() } = {}) {
  if (!coupon) {
    return { ok: false, code: 'COUPON_NOT_FOUND', message: 'Invalid coupon code.' };
  }
  if (coupon.isActive === false) {
    return { ok: false, code: 'COUPON_DISABLED', message: 'This coupon has been disabled.' };
  }
  const nowMs = now.getTime();
  const startMs = coupon.startAt ? new Date(coupon.startAt).getTime() : -Infinity;
  const endMs = coupon.endAt ? new Date(coupon.endAt).getTime() : Infinity;
  if (nowMs >= endMs) {
    return { ok: false, code: 'COUPON_EXPIRED', message: 'This coupon has expired.' };
  }
  if (nowMs < startMs) {
    return { ok: false, code: 'COUPON_SCHEDULED', message: 'This coupon is not active yet.' };
  }
  const usageCount = coupon.usageCount ?? 0;
  if (coupon.usageLimit != null && usageCount >= coupon.usageLimit) {
    return { ok: false, code: 'COUPON_USAGE_LIMIT_REACHED', message: 'This coupon has reached its usage limit.' };
  }
  const customerUsage = coupon.customerUsage ?? {};
  const customerKey = customerId ? sanitizeCustomerKey(customerId) : null;
  const customerCount = customerKey ? customerUsage[customerKey] ?? 0 : 0;
  if (coupon.maxUsesPerCustomer != null && customerCount >= coupon.maxUsesPerCustomer) {
    return {
      ok: false,
      code: 'COUPON_CUSTOMER_USAGE_LIMIT_REACHED',
      message: 'You have already used this coupon the maximum number of times.',
    };
  }
  const nextCustomerUsage = customerKey ? { ...customerUsage, [customerKey]: customerCount + 1 } : customerUsage;
  return { ok: true, coupon: { ...coupon, usageCount: usageCount + 1, customerUsage: nextCustomerUsage } };
}

// Gives back one use — the compensating transition for a reservation that
// must be undone (order creation failed, inventory ran out). Never rejects:
// a release should always be able to proceed, and counts are clamped at 0 so
// a duplicate/late release can't push them negative.
export function releaseCouponUsageOnData(coupon, { customerId } = {}) {
  if (!coupon) return coupon;
  const usageCount = Math.max(0, (coupon.usageCount ?? 0) - 1);
  const customerUsage = { ...coupon.customerUsage };
  const customerKey = customerId ? sanitizeCustomerKey(customerId) : null;
  if (customerKey) {
    customerUsage[customerKey] = Math.max(0, (customerUsage[customerKey] ?? 0) - 1);
  }
  return { ...coupon, usageCount, customerUsage };
}

// Full checkout-time eligibility check: reuses the same status/date/usage
// gates reserveCouponUsageOnData enforces (so "can I apply this" and "will
// redeeming it succeed" never disagree), then layers on the checks that
// aren't about concurrency — first-order-only, target match, minimum order.
export function evaluateCoupon(coupon, { items, customerId, isFirstOrder, now = new Date() } = {}) {
  const gate = reserveCouponUsageOnData(coupon, { customerId, now });
  if (!gate.ok) return { ok: false, code: gate.code, message: gate.message };

  if (coupon.firstOrderOnly && !isFirstOrder) {
    return { ok: false, code: 'COUPON_FIRST_ORDER_ONLY', message: 'This coupon is valid for first orders only.' };
  }

  const eligibleAmount = computeEligibleAmount(coupon, items);
  if (eligibleAmount <= 0) {
    return {
      ok: false,
      code: 'COUPON_NOT_APPLICABLE',
      message: 'This coupon does not apply to any item in your cart.',
    };
  }
  if (coupon.minimumOrderValue && eligibleAmount < coupon.minimumOrderValue) {
    return {
      ok: false,
      code: 'MINIMUM_ORDER_VALUE_NOT_MET',
      message: `Add ₹${Math.ceil(coupon.minimumOrderValue - eligibleAmount)} more to use this coupon (minimum order ₹${coupon.minimumOrderValue}).`,
    };
  }

  return { ok: true, eligibleAmount, discount: calculateDiscount(coupon, eligibleAmount) };
}

// Cart-wide totals once a coupon (or none) is applied — the single place
// subtotal/discount/tax/grand-total are derived so the cart, shipping and
// payment pages can never disagree on what the customer owes.
export function computeCartTotals(items, taxRatePercent, coupon) {
  const subtotal = (items || []).reduce((sum, item) => sum + item.price * item.quantity, 0);
  const eligibleAmount = coupon ? computeEligibleAmount(coupon, items) : 0;
  const discount = coupon ? calculateDiscount(coupon, eligibleAmount) : 0;
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = taxableAmount * (taxRatePercent / 100);
  const grandTotal = taxableAmount + tax;
  return { subtotal, eligibleAmount, discount, taxableAmount, tax, grandTotal };
}

// Admin form validation (section 16 of the spec) — returns a field->message
// map, empty when the input is valid.
export function validateCouponInput(input) {
  const errors = {};
  if (!input.code || !input.code.trim()) errors.code = 'Coupon code is required.';
  if (!input.name || !input.name.trim()) errors.name = 'Coupon name is required.';

  if (input.discountType === DISCOUNT_TYPES.PERCENTAGE) {
    if (!(input.discountValue > 0) || input.discountValue > 100) {
      errors.discountValue = 'Percentage must be greater than 0 and at most 100.';
    }
  } else if (input.discountType === DISCOUNT_TYPES.FIXED) {
    if (!(input.discountValue > 0)) errors.discountValue = 'Fixed discount must be greater than 0.';
  } else {
    errors.discountType = 'Select a discount type.';
  }

  if (input.maximumDiscountAmount != null && input.maximumDiscountAmount < 0) {
    errors.maximumDiscountAmount = 'Maximum discount cannot be negative.';
  }
  if (input.minimumOrderValue != null && input.minimumOrderValue < 0) {
    errors.minimumOrderValue = 'Minimum order value cannot be negative.';
  }
  if (input.usageLimit != null && input.usageLimit < 0) {
    errors.usageLimit = 'Maximum total uses cannot be negative.';
  }
  if (input.maxUsesPerCustomer != null && input.maxUsesPerCustomer < 0) {
    errors.maxUsesPerCustomer = 'Maximum uses per customer cannot be negative.';
  }

  if (!input.startAt || !input.endAt) {
    errors.endAt = 'Start and end dates are required.';
  } else if (new Date(input.startAt).getTime() >= new Date(input.endAt).getTime()) {
    errors.endAt = 'End date must be after the start date.';
  }

  return errors;
}
