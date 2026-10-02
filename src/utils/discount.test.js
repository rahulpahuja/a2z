import { describe, it, expect } from 'vitest';
import {
  DISCOUNT_UNITS,
  DISCOUNT_DURATIONS,
  DISCOUNT_END_TIME_MODES,
  isDiscountActive,
  getDiscountedPrice,
  getDiscountLabel,
  getDiscountCountdownMs,
  getPriceBreakdown,
  validateDiscountInput,
} from './discount.js';

const NOW = new Date('2026-06-15T12:00:00.000Z');

describe('isDiscountActive', () => {
  it('is false when there is no discount value at all', () => {
    expect(isDiscountActive({ price: 1000 }, NOW)).toBe(false);
  });

  it.each([0, -10, NaN, undefined, null, 'abc'])('is false for a non-positive/invalid discountValue %p', (value) => {
    expect(isDiscountActive({ price: 1000, discountValue: value }, NOW)).toBe(false);
  });

  it('defaults to forever (active) when no durationType is set', () => {
    expect(isDiscountActive({ price: 1000, discountValue: 10 }, NOW)).toBe(true);
  });

  it('is active when durationType is FOREVER', () => {
    expect(
      isDiscountActive({ price: 1000, discountValue: 10, discountDurationType: DISCOUNT_DURATIONS.FOREVER }, NOW)
    ).toBe(true);
  });

  it('is active when UNTIL_DATE and the end date is still in the future', () => {
    expect(
      isDiscountActive(
        { price: 1000, discountValue: 10, discountDurationType: DISCOUNT_DURATIONS.UNTIL_DATE, discountEndDate: '2026-06-20' },
        NOW
      )
    ).toBe(true);
  });

  it('is active through the entire end date (end-of-day inclusive)', () => {
    expect(
      isDiscountActive(
        { price: 1000, discountValue: 10, discountDurationType: DISCOUNT_DURATIONS.UNTIL_DATE, discountEndDate: '2026-06-15' },
        NOW
      )
    ).toBe(true);
  });

  it('is expired once past the end date', () => {
    expect(
      isDiscountActive(
        { price: 1000, discountValue: 10, discountDurationType: DISCOUNT_DURATIONS.UNTIL_DATE, discountEndDate: '2026-06-14' },
        NOW
      )
    ).toBe(false);
  });

  it('is false for UNTIL_DATE with no end date set', () => {
    expect(
      isDiscountActive({ price: 1000, discountValue: 10, discountDurationType: DISCOUNT_DURATIONS.UNTIL_DATE }, NOW)
    ).toBe(false);
  });

  it('is false for UNTIL_DATE with a malformed end date', () => {
    expect(
      isDiscountActive(
        { price: 1000, discountValue: 10, discountDurationType: DISCOUNT_DURATIONS.UNTIL_DATE, discountEndDate: 'not-a-date' },
        NOW
      )
    ).toBe(false);
  });

  describe('with a CUSTOM_TIME end time', () => {
    const customTimeProduct = (overrides = {}) => ({
      price: 1000,
      discountValue: 10,
      discountDurationType: DISCOUNT_DURATIONS.UNTIL_DATE,
      discountEndDate: '2026-06-15',
      discountEndTimeMode: DISCOUNT_END_TIME_MODES.CUSTOM_TIME,
      discountEndTime: '18:30:00',
      ...overrides,
    });

    it('is active right up to the custom end time', () => {
      const now = new Date('2026-06-15T18:30:00');
      expect(isDiscountActive(customTimeProduct(), now)).toBe(true);
    });

    it('is expired a moment after the custom end time', () => {
      const now = new Date('2026-06-15T18:30:01');
      expect(isDiscountActive(customTimeProduct(), now)).toBe(false);
    });

    it('is expired later the same day, well past the custom end time', () => {
      const now = new Date('2026-06-15T20:00:00');
      expect(isDiscountActive(customTimeProduct(), now)).toBe(false);
    });

    it('falls back to end-of-day when discountEndTimeMode is END_OF_DAY despite a stray discountEndTime', () => {
      const product = customTimeProduct({ discountEndTimeMode: DISCOUNT_END_TIME_MODES.END_OF_DAY });
      const now = new Date('2026-06-15T20:00:00'); // after 18:30, but before end of day
      expect(isDiscountActive(product, now)).toBe(true);
    });

    it('falls back to end-of-day when discountEndTime is missing even though mode is CUSTOM_TIME', () => {
      const product = customTimeProduct({ discountEndTime: '' });
      const now = new Date('2026-06-15T20:00:00');
      expect(isDiscountActive(product, now)).toBe(true);
    });
  });
});

describe('getDiscountedPrice', () => {
  it('returns the plain price when no discount is active', () => {
    expect(getDiscountedPrice({ price: 1000 }, NOW)).toBe(1000);
  });

  it.each([
    [1000, 10, 900],
    [1000, 50, 500],
    [999, 33, 669], // 999 * 0.67 = 669.33 -> rounds to 669
    [1000, 100, 0],
  ])('applies a %i-price PERCENTAGE discount of %i%% -> %i', (price, pct, expected) => {
    expect(
      getDiscountedPrice({ price, discountUnit: DISCOUNT_UNITS.PERCENTAGE, discountValue: pct }, NOW)
    ).toBe(expected);
  });

  it('clamps a percentage discount above 100 to 100', () => {
    expect(
      getDiscountedPrice({ price: 1000, discountUnit: DISCOUNT_UNITS.PERCENTAGE, discountValue: 250 }, NOW)
    ).toBe(0);
  });

  it.each([
    [1000, 200, 800],
    [1000, 1000, 0],
    [1000, 5000, 0], // never goes negative
  ])('applies a %i-price FIXED discount of ₹%i -> %i', (price, flat, expected) => {
    expect(getDiscountedPrice({ price, discountUnit: DISCOUNT_UNITS.FIXED, discountValue: flat }, NOW)).toBe(expected);
  });

  it('ignores an expired dated discount and returns the plain price', () => {
    const product = {
      price: 1000,
      discountUnit: DISCOUNT_UNITS.PERCENTAGE,
      discountValue: 50,
      discountDurationType: DISCOUNT_DURATIONS.UNTIL_DATE,
      discountEndDate: '2020-01-01',
    };
    expect(getDiscountedPrice(product, NOW)).toBe(1000);
  });

  it('treats a missing/non-numeric price as 0', () => {
    expect(getDiscountedPrice({ discountValue: 10 }, NOW)).toBe(0);
  });
});

describe('getPriceBreakdown', () => {
  it('reports no discount for a plain product', () => {
    expect(getPriceBreakdown({ price: 1000 }, NOW)).toEqual({
      originalPrice: 1000,
      discountedPrice: 1000,
      hasDiscount: false,
      discountLabel: null,
    });
  });

  it('reports the active admin-configured discount, with its label', () => {
    const product = { price: 1000, discountUnit: DISCOUNT_UNITS.PERCENTAGE, discountValue: 20 };
    expect(getPriceBreakdown(product, NOW)).toEqual({
      originalPrice: 1000,
      discountedPrice: 800,
      hasDiscount: true,
      discountLabel: '20% OFF',
    });
  });

  it('falls back to a legacy static originalPrice when no admin discount is active', () => {
    expect(getPriceBreakdown({ price: 800, originalPrice: 1000 }, NOW)).toEqual({
      originalPrice: 1000,
      discountedPrice: 800,
      hasDiscount: true,
      discountLabel: null,
    });
  });

  it('prefers the admin-configured discount over a stale legacy originalPrice', () => {
    const product = { price: 1000, originalPrice: 1200, discountUnit: DISCOUNT_UNITS.FIXED, discountValue: 300 };
    expect(getPriceBreakdown(product, NOW)).toEqual({
      originalPrice: 1000,
      discountedPrice: 700,
      hasDiscount: true,
      discountLabel: '₹300 OFF',
    });
  });

  it('ignores a legacy originalPrice that is not actually higher than price', () => {
    expect(getPriceBreakdown({ price: 1000, originalPrice: 900 }, NOW)).toEqual({
      originalPrice: 1000,
      discountedPrice: 1000,
      hasDiscount: false,
      discountLabel: null,
    });
  });
});

describe('getDiscountLabel', () => {
  it('is null when there is no active discount', () => {
    expect(getDiscountLabel({ price: 1000 }, NOW)).toBeNull();
  });

  it('labels a whole-number percentage discount', () => {
    expect(
      getDiscountLabel({ price: 1000, discountUnit: DISCOUNT_UNITS.PERCENTAGE, discountValue: 10 }, NOW)
    ).toBe('10% OFF');
  });

  it('labels a fractional percentage discount', () => {
    expect(
      getDiscountLabel({ price: 1000, discountUnit: DISCOUNT_UNITS.PERCENTAGE, discountValue: 12.5 }, NOW)
    ).toBe('12.5% OFF');
  });

  it('clamps a percentage label at 100%', () => {
    expect(
      getDiscountLabel({ price: 1000, discountUnit: DISCOUNT_UNITS.PERCENTAGE, discountValue: 250 }, NOW)
    ).toBe('100% OFF');
  });

  it('labels a FIXED (rupee) discount', () => {
    expect(getDiscountLabel({ price: 1000, discountUnit: DISCOUNT_UNITS.FIXED, discountValue: 100 }, NOW)).toBe(
      '₹100 OFF'
    );
  });

  it('is null once the dated discount has expired', () => {
    const product = {
      price: 1000,
      discountUnit: DISCOUNT_UNITS.PERCENTAGE,
      discountValue: 10,
      discountDurationType: DISCOUNT_DURATIONS.UNTIL_DATE,
      discountEndDate: '2020-01-01',
    };
    expect(getDiscountLabel(product, NOW)).toBeNull();
  });
});

describe('getDiscountCountdownMs', () => {
  // Built the same way getDiscountEndTime parses discountEndDate
  // ('${date}T23:59:59.999', local time) so the diffs below are exact
  // regardless of the machine's timezone.
  const END_OF_DAY = new Date('2026-06-15T23:59:59.999');
  const datedProduct = (overrides = {}) => ({
    price: 1000,
    discountUnit: DISCOUNT_UNITS.PERCENTAGE,
    discountValue: 10,
    discountDurationType: DISCOUNT_DURATIONS.UNTIL_DATE,
    discountEndDate: '2026-06-15',
    ...overrides,
  });

  it('is null for a FOREVER discount, however close "now" is to any date', () => {
    const product = { price: 1000, discountUnit: DISCOUNT_UNITS.PERCENTAGE, discountValue: 10 };
    expect(getDiscountCountdownMs(product, END_OF_DAY)).toBeNull();
  });

  it('is null when there is no active discount at all', () => {
    expect(getDiscountCountdownMs({ price: 1000 }, END_OF_DAY)).toBeNull();
  });

  it('is null when more than an hour remains', () => {
    const now = new Date(END_OF_DAY.getTime() - 60 * 60 * 1000 - 1);
    expect(getDiscountCountdownMs(datedProduct(), now)).toBeNull();
  });

  it('returns the exact ms remaining at the one-hour boundary', () => {
    const now = new Date(END_OF_DAY.getTime() - 60 * 60 * 1000);
    expect(getDiscountCountdownMs(datedProduct(), now)).toBe(60 * 60 * 1000);
  });

  it('counts down inside the final hour', () => {
    const now = new Date(END_OF_DAY.getTime() - 5 * 60 * 1000);
    expect(getDiscountCountdownMs(datedProduct(), now)).toBe(5 * 60 * 1000);
  });

  it('is null once the end instant has passed (discount simply expired)', () => {
    const now = new Date(END_OF_DAY.getTime() + 1);
    expect(getDiscountCountdownMs(datedProduct(), now)).toBeNull();
  });

  it('is null at the exact end instant', () => {
    expect(getDiscountCountdownMs(datedProduct(), END_OF_DAY)).toBeNull();
  });
});

describe('validateDiscountInput', () => {
  it('is valid (null) when no discount value was entered', () => {
    expect(validateDiscountInput({ discountUnit: DISCOUNT_UNITS.PERCENTAGE, discountValue: '' })).toBeNull();
    expect(validateDiscountInput({})).toBeNull();
  });

  it.each(['0', '-5', 'abc', 'NaN'])('rejects a non-positive/non-numeric value %p', (value) => {
    expect(validateDiscountInput({ discountUnit: DISCOUNT_UNITS.PERCENTAGE, discountValue: value })).toMatch(
      /positive number/
    );
  });

  it('rejects a percentage value over 100', () => {
    expect(
      validateDiscountInput({ discountUnit: DISCOUNT_UNITS.PERCENTAGE, discountValue: '101' })
    ).toMatch(/cannot exceed 100/);
  });

  it('accepts a percentage value of exactly 100', () => {
    expect(validateDiscountInput({ discountUnit: DISCOUNT_UNITS.PERCENTAGE, discountValue: '100' })).toBeNull();
  });

  it('does not cap a FIXED (rupee) value at 100', () => {
    expect(validateDiscountInput({ discountUnit: DISCOUNT_UNITS.FIXED, discountValue: '5000' })).toBeNull();
  });

  it('requires an end date when duration is UNTIL_DATE', () => {
    expect(
      validateDiscountInput({
        discountUnit: DISCOUNT_UNITS.PERCENTAGE,
        discountValue: '10',
        discountDurationType: DISCOUNT_DURATIONS.UNTIL_DATE,
      })
    ).toMatch(/end date/);
  });

  it('is valid with an end date when duration is UNTIL_DATE', () => {
    expect(
      validateDiscountInput({
        discountUnit: DISCOUNT_UNITS.PERCENTAGE,
        discountValue: '10',
        discountDurationType: DISCOUNT_DURATIONS.UNTIL_DATE,
        discountEndDate: '2026-12-31',
      })
    ).toBeNull();
  });

  it('does not require an end date when duration is FOREVER', () => {
    expect(
      validateDiscountInput({
        discountUnit: DISCOUNT_UNITS.PERCENTAGE,
        discountValue: '10',
        discountDurationType: DISCOUNT_DURATIONS.FOREVER,
      })
    ).toBeNull();
  });

  it('defaults to END_OF_DAY and does not require an end time when the mode is unset', () => {
    expect(
      validateDiscountInput({
        discountUnit: DISCOUNT_UNITS.PERCENTAGE,
        discountValue: '10',
        discountDurationType: DISCOUNT_DURATIONS.UNTIL_DATE,
        discountEndDate: '2026-12-31',
      })
    ).toBeNull();
  });

  it('requires an end time when discountEndTimeMode is CUSTOM_TIME', () => {
    expect(
      validateDiscountInput({
        discountUnit: DISCOUNT_UNITS.PERCENTAGE,
        discountValue: '10',
        discountDurationType: DISCOUNT_DURATIONS.UNTIL_DATE,
        discountEndDate: '2026-12-31',
        discountEndTimeMode: DISCOUNT_END_TIME_MODES.CUSTOM_TIME,
      })
    ).toMatch(/end time/);
  });

  it('is valid with an end time when discountEndTimeMode is CUSTOM_TIME', () => {
    expect(
      validateDiscountInput({
        discountUnit: DISCOUNT_UNITS.PERCENTAGE,
        discountValue: '10',
        discountDurationType: DISCOUNT_DURATIONS.UNTIL_DATE,
        discountEndDate: '2026-12-31',
        discountEndTimeMode: DISCOUNT_END_TIME_MODES.CUSTOM_TIME,
        discountEndTime: '18:30:00',
      })
    ).toBeNull();
  });
});
