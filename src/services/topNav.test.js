import { describe, it, expect } from 'vitest';
import { findNavLinkLabel } from './topNav.js';

const links = [
  { id: '1', label: 'New Arrivals', type: 'all' },
  { id: '2', label: "Girl's Wear", type: 'category', categories: ['Barbie Dress', 'Gown', 'Top'] },
  { id: '3', label: 'Kurtis', type: 'category', category: 'Kurti' },
];

describe('findNavLinkLabel', () => {
  it('names a category set after the nav link that points at it, in any order', () => {
    expect(findNavLinkLabel(links, ['Top', 'Barbie Dress', 'Gown'])).toBe("Girl's Wear");
  });

  it('returns null for a different set, a single category, or a partial match', () => {
    expect(findNavLinkLabel(links, ['Top', 'Gown'])).toBeNull();
    expect(findNavLinkLabel(links, ['Kurti'])).toBeNull();
    expect(findNavLinkLabel(links, [])).toBeNull();
  });
});
