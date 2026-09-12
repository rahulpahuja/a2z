import { describe, it, expect } from 'vitest';
import {
  calculateDiscount,
  computeEligibleAmount,
  computeCartTotals,
  formatCouponBadge,
  getCouponStatus,
  reserveCouponUsageOnData,
  releaseCouponUsageOnData,
  evaluateCoupon,
  validateCouponInput,
} from './coupons.js';

const save50 = {
  code: 'SAVE50',
  name: 'Save 50',
  discountType: 'PERCENTAGE',
  discountValue: 50,
  maximumDiscountAmount: 100,
  minimumOrderValue: 200,
  targetType: 'ALL',
  startAt: '2026-01-01T00:00:00.000Z',
  endAt: '2026-12-31T23:59:59.000Z',
  isActive: true,
  usageLimit: 500,
  usageCount: 0,
  maxUsesPerCustomer: 1,
};

describe('calculateDiscount', () => {
  it.each([
    [50, 25],
    [100, 50],
    [150, 75],
    [200, 100],
    [500, 100],
    [1000, 100],
  ])('caps 50%% off up to ₹100 at eligibleAmount=%d -> %d', (eligibleAmount, expected) => {
    expect(calculateDiscount(save50, eligibleAmount)).toBe(expected);
  });

  it('never exceeds the eligible amount for a fixed discount', () => {
    const flat100 = { discountType: 'FIXED', discountValue: 100 };
    expect(calculateDiscount(flat100, 70)).toBe(70);
    expect(calculateDiscount(flat100, 500)).toBe(100);
  });

  it('supports an unlimited (no maximumDiscountAmount) percentage coupon', () => {
    const unlimited = { discountType: 'PERCENTAGE', discountValue: 50, maximumDiscountAmount: null };
    expect(calculateDiscount(unlimited, 1000)).toBe(500);
  });

  it('returns 0 for a non-positive eligible amount', () => {
    expect(calculateDiscount(save50, 0)).toBe(0);
  });
});

describe('computeEligibleAmount', () => {
  const items = [
    { id: 'p1', categoryId: 'cat_electronics', price: 200, quantity: 1 },
    { id: 'p2', categoryId: 'cat_apparel', price: 500, quantity: 1 },
  ];

  it('sums the whole cart for an ALL-targeted coupon', () => {
    expect(computeEligibleAmount({ targetType: 'ALL' }, items)).toBe(700);
  });

  it('sums only matching-category lines for a CATEGORY-targeted coupon', () => {
    const coupon = { targetType: 'CATEGORY', targetIds: ['cat_electronics'] };
    expect(computeEligibleAmount(coupon, items)).toBe(200);
  });
});

describe('formatCouponBadge', () => {
  it('shows the cap, never a bare percentage when one is set', () => {
    expect(formatCouponBadge(save50)).toBe('50% OFF up to ₹100');
  });

  it('omits the cap when unset', () => {
    expect(formatCouponBadge({ discountType: 'PERCENTAGE', discountValue: 50, maximumDiscountAmount: null })).toBe(
      '50% OFF'
    );
  });

  it('formats a fixed coupon', () => {
    expect(formatCouponBadge({ discountType: 'FIXED', discountValue: 100 })).toBe('₹100 OFF');
  });
});

describe('getCouponStatus', () => {
  const base = { startAt: '2026-09-01T00:00:00.000Z', endAt: '2026-10-01T00:00:00.000Z', isActive: true };

  it('is SCHEDULED before startAt', () => {
    expect(getCouponStatus(base, new Date('2026-08-15T00:00:00.000Z'))).toBe('SCHEDULED');
  });

  it('is ACTIVE within the window and under the usage limit', () => {
    expect(getCouponStatus({ ...base, usageLimit: 10, usageCount: 5 }, new Date('2026-09-15T00:00:00.000Z'))).toBe(
      'ACTIVE'
    );
  });

  it('is EXPIRED at/after endAt', () => {
    expect(getCouponStatus(base, new Date('2026-10-01T00:00:00.000Z'))).toBe('EXPIRED');
  });

  it('is USAGE_LIMIT_REACHED once usageCount hits usageLimit', () => {
    expect(getCouponStatus({ ...base, usageLimit: 10, usageCount: 10 }, new Date('2026-09-15T00:00:00.000Z'))).toBe(
      'USAGE_LIMIT_REACHED'
    );
  });

  it('DISABLED wins over every date/usage condition', () => {
    expect(
      getCouponStatus({ ...base, isActive: false, usageLimit: 10, usageCount: 10 }, new Date('2026-09-15T00:00:00.000Z'))
    ).toBe('DISABLED');
  });
});

describe('reserveCouponUsageOnData / releaseCouponUsageOnData', () => {
  const now = new Date('2026-09-15T00:00:00.000Z');

  it('increments usageCount and the customer counter on success', () => {
    const result = reserveCouponUsageOnData(save50, { customerId: 'cust-a', now });
    expect(result.ok).toBe(true);
    expect(result.coupon.usageCount).toBe(1);
    expect(result.coupon.customerUsage['cust-a']).toBe(1);
  });

  it('rejects once usageLimit is reached without mutating anything', () => {
    const exhausted = { ...save50, usageCount: 500 };
    const result = reserveCouponUsageOnData(exhausted, { customerId: 'cust-a', now });
    expect(result).toEqual({
      ok: false,
      code: 'COUPON_USAGE_LIMIT_REACHED',
      message: 'This coupon has reached its usage limit.',
    });
  });

  it('10 concurrent reservations at 499/500 each see a fresh read and only one succeeds', () => {
    // Simulates what the Firebase transaction's compare-and-swap loop
    // guarantees: every attempt reads the latest committed value, so exactly
    // one of 10 callers racing the last slot wins.
    let coupon = { ...save50, usageCount: 499 };
    let successes = 0;
    for (let i = 0; i < 10; i += 1) {
      const result = reserveCouponUsageOnData(coupon, { customerId: `cust-${i}`, now });
      if (result.ok) {
        successes += 1;
        coupon = result.coupon;
      }
    }
    expect(successes).toBe(1);
    expect(coupon.usageCount).toBe(500);
  });

  it('rejects a second use from the same customer when maxUsesPerCustomer is 1', () => {
    const afterFirstUse = reserveCouponUsageOnData(save50, { customerId: 'cust-a', now }).coupon;
    const second = reserveCouponUsageOnData(afterFirstUse, { customerId: 'cust-a', now });
    expect(second.ok).toBe(false);
    expect(second.code).toBe('COUPON_CUSTOMER_USAGE_LIMIT_REACHED');
  });

  it('release gives back exactly one global and one per-customer use', () => {
    const reserved = reserveCouponUsageOnData(save50, { customerId: 'cust-a', now }).coupon;
    const released = releaseCouponUsageOnData(reserved, { customerId: 'cust-a' });
    expect(released.usageCount).toBe(0);
    expect(released.customerUsage['cust-a']).toBe(0);
  });

  it('release clamps at 0 instead of going negative on a duplicate release', () => {
    const released = releaseCouponUsageOnData(releaseCouponUsageOnData(save50, { customerId: 'cust-a' }), {
      customerId: 'cust-a',
    });
    expect(released.usageCount).toBe(0);
  });

  it('rejects a disabled coupon regardless of dates/usage', () => {
    const disabled = { ...save50, isActive: false };
    expect(reserveCouponUsageOnData(disabled, { now }).code).toBe('COUPON_DISABLED');
  });

  it('rejects an expired coupon', () => {
    expect(reserveCouponUsageOnData(save50, { now: new Date('2027-01-01T00:00:00.000Z') }).code).toBe(
      'COUPON_EXPIRED'
    );
  });
});

describe('evaluateCoupon', () => {
  const now = new Date('2026-09-15T00:00:00.000Z');
  const items = [{ id: 'p1', price: 500, quantity: 1 }];

  it('rejects when the cart is below minimumOrderValue', () => {
    const result = evaluateCoupon(save50, { items: [{ id: 'p1', price: 50, quantity: 1 }], now });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('MINIMUM_ORDER_VALUE_NOT_MET');
  });

  it('computes the eligible discount when every rule passes', () => {
    const result = evaluateCoupon(save50, { items, now });
    expect(result).toEqual({ ok: true, eligibleAmount: 500, discount: 100 });
  });

  it('rejects a first-order-only coupon for a repeat customer', () => {
    const welcome20 = { ...save50, firstOrderOnly: true };
    const result = evaluateCoupon(welcome20, { items, now, isFirstOrder: false });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('COUPON_FIRST_ORDER_ONLY');
  });
});

describe('computeCartTotals', () => {
  it('taxes the post-discount amount and carries the discount through to grandTotal', () => {
    const items = [{ id: 'p1', price: 1000, quantity: 1 }];
    const totals = computeCartTotals(items, 10, save50);
    expect(totals.subtotal).toBe(1000);
    expect(totals.discount).toBe(100);
    expect(totals.taxableAmount).toBe(900);
    expect(totals.tax).toBe(90);
    expect(totals.grandTotal).toBe(990);
  });

  it('matches the plain subtotal+tax when no coupon is applied', () => {
    const items = [{ id: 'p1', price: 1000, quantity: 1 }];
    const totals = computeCartTotals(items, 10, null);
    expect(totals.discount).toBe(0);
    expect(totals.grandTotal).toBe(1100);
  });
});

describe('validateCouponInput', () => {
  it('accepts a well-formed percentage coupon', () => {
    expect(validateCouponInput(save50)).toEqual({});
  });

  it.each([0, -5, 101])('rejects a percentage discountValue of %d', (discountValue) => {
    const errors = validateCouponInput({ ...save50, discountValue });
    expect(errors.discountValue).toBeTruthy();
  });

  it('rejects startAt >= endAt', () => {
    const errors = validateCouponInput({ ...save50, startAt: save50.endAt, endAt: save50.startAt });
    expect(errors.endAt).toBeTruthy();
  });

  it('rejects a negative usage limit', () => {
    expect(validateCouponInput({ ...save50, usageLimit: -1 }).usageLimit).toBeTruthy();
  });
});
