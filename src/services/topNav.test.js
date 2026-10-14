import { describe, it, expect } from 'vitest';
import { findNavLinkLabel, isAllProductsView } from './topNav.js';

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

describe('isAllProductsView', () => {
  it('is true only for the unfiltered /products listing', () => {
    expect(isAllProductsView('/products')).toBe(true);
    expect(isAllProductsView('/products/')).toBe(true);
    expect(isAllProductsView('/products', '?sort=price')).toBe(true);
  });

  it('is false for category and New Arrivals views of the same path', () => {
    expect(isAllProductsView('/products', '?category=Kurti')).toBe(false);
    expect(isAllProductsView('/products', '?filter=new-arrivals')).toBe(false);
  });

  it('is false for other routes, including product detail pages', () => {
    expect(isAllProductsView('/')).toBe(false);
    expect(isAllProductsView('/products/abc')).toBe(false);
    expect(isAllProductsView('/cart')).toBe(false);
  });
});
