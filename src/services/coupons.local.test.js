import { describe, it, expect, vi, beforeEach } from 'vitest';

// Exercises the exact local/no-Firebase branch of services/coupons.js that
// this app actually ships (see firebase.js: isFirebaseEnabled is false
// whenever VITE_FIREBASE_API_KEY isn't set) — a real regression test for the
// wiring CartContext.placeOrder depends on, not just the pure logic in
// utils/coupons.js.
vi.mock('../firebase.js', () => ({ isFirebaseEnabled: false, db: null }));

// This project's jsdom test environment doesn't wire up window.localStorage
// by default — a minimal in-memory stand-in is enough since coupons.js only
// calls getItem/setItem/removeItem.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

const { createCoupon, reserveCouponUsage, releaseCouponUsage, getCouponByCode } = await import('./coupons.js');

beforeEach(() => {
  localStorage.clear();
});

describe('reserveCouponUsage (local/no-Firebase mode)', () => {
  const now = new Date('2026-09-15T00:00:00.000Z');

  async function createOncePerCustomerCoupon() {
    return createCoupon({
      code: 'SAVE50',
      name: 'Save 50',
      discountType: 'PERCENTAGE',
      discountValue: 50,
      maximumDiscountAmount: 100,
      minimumOrderValue: 200,
      startAt: '2026-01-01T00:00:00.000Z',
      endAt: '2026-12-31T23:59:59.000Z',
      isActive: true,
      usageLimit: 500,
      maxUsesPerCustomer: 1,
    });
  }

  it('blocks a second redemption by the same customer, but allows a different customer (spec section 5)', async () => {
    await createOncePerCustomerCoupon();

    const first = await reserveCouponUsage('SAVE50', 'customer-a', now);
    expect(first.usageCount).toBe(1);
    expect(first.customerUsage['customer-a']).toBe(1);

    await expect(reserveCouponUsage('SAVE50', 'customer-a', now)).rejects.toMatchObject({
      code: 'COUPON_CUSTOMER_USAGE_LIMIT_REACHED',
    });

    const second = await reserveCouponUsage('SAVE50', 'customer-b', now);
    expect(second.usageCount).toBe(2);
    expect(second.customerUsage['customer-b']).toBe(1);

    // Global usage = 2/500; customer A still can't redeem a third time.
    await expect(reserveCouponUsage('SAVE50', 'customer-a', now)).rejects.toMatchObject({
      code: 'COUPON_CUSTOMER_USAGE_LIMIT_REACHED',
    });
  });

  it('lets the same customer redeem again once a prior reservation is released (order rolled back)', async () => {
    await createOncePerCustomerCoupon();
    await reserveCouponUsage('SAVE50', 'customer-a', now);
    await releaseCouponUsage('SAVE50', 'customer-a');

    const coupon = await getCouponByCode('SAVE50');
    expect(coupon.usageCount).toBe(0);
    expect(coupon.customerUsage['customer-a']).toBe(0);

    const retried = await reserveCouponUsage('SAVE50', 'customer-a', now);
    expect(retried.usageCount).toBe(1);
  });

  it('is unlimited per customer only when maxUsesPerCustomer is explicitly null', async () => {
    await createCoupon({
      code: 'MULTI',
      name: 'Multi use',
      discountType: 'FIXED',
      discountValue: 50,
      startAt: '2026-01-01T00:00:00.000Z',
      endAt: '2026-12-31T23:59:59.000Z',
      isActive: true,
      usageLimit: null,
      maxUsesPerCustomer: null,
    });

    await reserveCouponUsage('MULTI', 'customer-a', now);
    const second = await reserveCouponUsage('MULTI', 'customer-a', now);
    expect(second.customerUsage['customer-a']).toBe(2);
  });
});
