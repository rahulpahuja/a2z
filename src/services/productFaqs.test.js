import { describe, it, expect, vi } from 'vitest';

vi.mock('../firebase.js', () => ({ db: null, isFirebaseEnabled: false }));

const { sanitizeFaqs, MAX_FAQS_PER_PRODUCT } = await import('./productFaqs.js');

describe('sanitizeFaqs', () => {
  it('trims entries and drops any with a blank question or answer', () => {
    const result = sanitizeFaqs([
      { question: '  Is it breathable? ', answer: ' Yes, it is. ' },
      { question: 'Half filled', answer: '   ' },
      { question: '', answer: 'Orphan answer' },
    ]);
    expect(result).toEqual([{ question: 'Is it breathable?', answer: 'Yes, it is.' }]);
  });

  it('returns an empty list for missing input', () => {
    expect(sanitizeFaqs(undefined)).toEqual([]);
  });

  it('caps the number of FAQs per product', () => {
    const many = Array.from({ length: MAX_FAQS_PER_PRODUCT + 5 }, (_, i) => ({ question: `Q${i}`, answer: 'A' }));
    expect(sanitizeFaqs(many)).toHaveLength(MAX_FAQS_PER_PRODUCT);
  });
});
