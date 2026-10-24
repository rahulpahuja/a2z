import { describe, it, expect } from 'vitest';
import { addProductId, applyCollection, categoriesOf, filterProducts, moveProductId, productLimit, reconcileHero, removeCollection, removeProductId } from './picker.js';

const products = [
  { id: 'p1', name: 'Rider Jacket', price: 3000, category: 'Jackets', sku: 'JK-001' },
  { id: 'p2', name: 'Baggy Jeans', price: 2000, category: 'Jeans', outOfStock: true },
  { id: 'p3', name: 'Cargo Jeans', price: 1500, categoryTitle: 'Jeans', sku: 'JN-003' },
];

describe('filterProducts', () => {
  it('searches name, id and SKU, every word, ignoring case', () => {
    expect(filterProducts(products, { query: 'jeans' }).map((p) => p.id)).toEqual(['p2', 'p3']);
    expect(filterProducts(products, { query: 'jk-001' }).map((p) => p.id)).toEqual(['p1']);
    expect(filterProducts(products, { query: 'P3' }).map((p) => p.id)).toEqual(['p3']);
    expect(filterProducts(products, { query: 'cargo jeans' }).map((p) => p.id)).toEqual(['p3']);
    expect(filterProducts(products, { query: 'cargo jacket' })).toEqual([]);
  });

  it('filters by category, availability, price and collection', () => {
    expect(filterProducts(products, { category: 'Jeans' }).map((p) => p.id)).toEqual(['p2', 'p3']);
    expect(filterProducts(products, { availability: 'in' }).map((p) => p.id)).toEqual(['p1', 'p3']);
    expect(filterProducts(products, { availability: 'out' }).map((p) => p.id)).toEqual(['p2']);
    expect(filterProducts(products, { minPrice: '1800', maxPrice: '2500' }).map((p) => p.id)).toEqual(['p2']);
    expect(filterProducts(products, { collection: { productIds: ['p3', 'p1'] } }).map((p) => p.id)).toEqual(['p1', 'p3']);
  });

  it('ignores empty or non-numeric price bounds and tolerates empty input', () => {
    expect(filterProducts(products, { minPrice: '', maxPrice: 'abc' })).toHaveLength(3);
    expect(filterProducts(undefined, {})).toEqual([]);
  });

  it('lists distinct categories', () => {
    expect(categoriesOf(products)).toEqual(['Jackets', 'Jeans']);
  });
});

describe('selection helpers', () => {
  it('respects the limit for the article type and never duplicates', () => {
    expect(productLimit('spotlight')).toBe(1);
    expect(addProductId(['a'], 'a', 5)).toEqual(['a']);
    const full = ['a'];
    expect(addProductId(full, 'b', 1)).toBe(full);
    expect(addProductId(['a'], 'b', 2)).toEqual(['a', 'b']);
  });

  it('removes and reorders', () => {
    expect(removeProductId(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
    expect(moveProductId(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    const ids = ['a', 'b'];
    expect(moveProductId(ids, 'a', -1)).toBe(ids);
    expect(moveProductId(ids, 'zz', 1)).toBe(ids);
  });

  it('drops the hero when its product is removed', () => {
    expect(reconcileHero({ productIds: ['a'], heroProductId: 'b' }).heroProductId).toBe('');
    expect(reconcileHero({ productIds: ['a'], heroProductId: 'a' }).heroProductId).toBe('a');
  });
});

describe('collections', () => {
  const base = { productIds: [], collectionIds: [], heroProductId: '', primaryCollectionId: '' };
  const winter = { id: 'c1', productIds: ['p1', 'ghost', 'p3'] };

  it('links the collection, adds its live products and makes it primary', () => {
    const { value, skipped } = applyCollection(base, winter, products, 10);
    expect(value).toMatchObject({ collectionIds: ['c1'], productIds: ['p1', 'p3'], primaryCollectionId: 'c1' });
    expect(skipped).toBe(0);
  });

  it('adds only what fits and reports how many were left out', () => {
    const { value, skipped } = applyCollection(base, winter, products, 1);
    expect(value.productIds).toEqual(['p1']);
    expect(skipped).toBe(1);
  });

  it('keeps products already chosen and does not link a collection twice', () => {
    const first = applyCollection({ ...base, productIds: ['p3'] }, winter, products, 10).value;
    expect(first.productIds).toEqual(['p3', 'p1']);
    expect(applyCollection(first, winter, products, 10).value.collectionIds).toEqual(['c1']);
  });

  it('removing a collection keeps the products and hands the primary role on', () => {
    const two = { ...base, collectionIds: ['c1', 'c2'], primaryCollectionId: 'c1', productIds: ['p1'] };
    expect(removeCollection(two, 'c1')).toMatchObject({ collectionIds: ['c2'], primaryCollectionId: 'c2', productIds: ['p1'] });
    expect(removeCollection({ ...base, collectionIds: ['c1'], primaryCollectionId: 'c1' }, 'c1').primaryCollectionId).toBe('');
  });
});
