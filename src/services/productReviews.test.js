import { describe, it, expect, vi } from 'vitest';

vi.mock('../firebase.js', () => ({ db: null, isFirebaseEnabled: false }));

const { sanitizeReview, REVIEW_LIMITS } = await import('./productReviews.js');

const valid = { name: '  Asha  ', rating: 4, title: ' Great fit ', body: 'Fits well and the fabric feels soft.' };

describe('sanitizeReview', () => {
  it('trims text fields and coerces the rating to a number', () => {
    expect(sanitizeReview({ ...valid, rating: '4' })).toEqual({
      name: 'Asha',
      rating: 4,
      title: 'Great fit',
      body: 'Fits well and the fabric feels soft.',
    });
  });

  it('allows an empty title', () => {
    expect(sanitizeReview({ ...valid, title: '' }).title).toBe('');
  });

  it('rejects a missing name', () => {
    expect(() => sanitizeReview({ ...valid, name: '   ' })).toThrow('Please enter your name');
  });

  it('rejects ratings that are not whole numbers from 1 to 5', () => {
    [0, 6, 3.5, undefined].forEach((rating) => {
      expect(() => sanitizeReview({ ...valid, rating })).toThrow('Please choose a star rating.');
    });
  });

  it('rejects a body shorter than the minimum or longer than the maximum', () => {
    expect(() => sanitizeReview({ ...valid, body: 'short' })).toThrow();
    expect(() => sanitizeReview({ ...valid, body: 'x'.repeat(REVIEW_LIMITS.bodyMax + 1) })).toThrow();
  });
});
