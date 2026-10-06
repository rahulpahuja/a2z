import { describe, it, expect } from 'vitest';
import { summarizeReviews } from './reviewStats.js';

describe('summarizeReviews', () => {
  it('returns zeroed stats when there are no reviews', () => {
    expect(summarizeReviews([])).toEqual({
      count: 0,
      average: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    });
  });

  it('computes the average and per-star distribution', () => {
    const reviews = [{ rating: 5 }, { rating: 4 }, { rating: 4 }, { rating: 1 }];
    const summary = summarizeReviews(reviews);
    expect(summary.count).toBe(4);
    expect(summary.average).toBe(3.5);
    expect(summary.distribution).toEqual({ 5: 1, 4: 2, 3: 0, 2: 0, 1: 1 });
  });

  it('excludes reviews without a usable 1–5 rating from every figure', () => {
    const summary = summarizeReviews([{ rating: 5 }, { rating: 9 }, {}]);
    expect(summary.count).toBe(1);
    expect(summary.average).toBe(5);
    expect(summary.distribution[5]).toBe(1);
  });
});
