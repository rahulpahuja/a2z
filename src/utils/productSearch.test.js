import { describe, it, expect } from 'vitest';
import { searchProducts } from './productSearch.js';

const PRODUCTS = [
  {
    id: 'p1',
    title: 'Cotton Kurti',
    description: 'Breathable everyday wear',
    categoryTitle: 'Kurtis',
    hashtags: ['ethnic', 'summer'],
    colors: ['blue'],
    sku: 'KUR-001',
  },
  {
    id: 'p2',
    title: 'Silk Saree',
    description: 'Festive occasion wear',
    categoryTitle: 'Sarees',
    hashtags: ['wedding', 'festive'],
    colors: ['red', 'gold'],
    sku: 'SAR-002',
  },
  {
    id: 'p3',
    name: 'Denim Jacket',
    category: 'Outerwear',
    description: 'Casual layering piece',
    hashtags: ['casual', 'denim'],
    colors: ['blue'],
    sku: 'JAC-003',
  },
];

describe('searchProducts', () => {
  it('returns an empty array for an empty query', () => {
    expect(searchProducts(PRODUCTS, '')).toEqual([]);
    expect(searchProducts(PRODUCTS, '   ')).toEqual([]);
  });

  it('tolerates a typo in the product title', () => {
    const results = searchProducts(PRODUCTS, 'kurit'); // transposed letters
    expect(results.some((p) => p.id === 'p1')).toBe(true);
  });

  it('matches against hashtags, not just title/description', () => {
    const results = searchProducts(PRODUCTS, 'festive');
    expect(results.some((p) => p.id === 'p2')).toBe(true);
  });

  it('matches legacy name/category fields on raw (unmerged) product objects', () => {
    const results = searchProducts(PRODUCTS, 'denim');
    expect(results.some((p) => p.id === 'p3')).toBe(true);
  });
});
