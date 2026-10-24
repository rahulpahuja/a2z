import { describe, it, expect } from 'vitest';
import { findSimilarProducts, productDistance, describeProduct, DEFAULT_K } from './similarProducts.js';

const colour = (name) => ({ name, sizes: [{ size: 'M', stock: 5 }] });
const product = (id, over = {}) => ({
  id, name: `Item ${id}`, categoryId: 'jeans', subcategoryId: 'baggy', gender: 'Male', price: 2000, colors: [colour('Blue')], hashtags: ['street'], ...over,
});
const ids = (list) => list.map((p) => p.id);

describe('findSimilarProducts', () => {
  it('ranks products in the same category, gender and price band ahead of unrelated ones', () => {
    const target = product('t', { name: 'Baggy Denim Jeans' });
    const close = product('close', { name: 'Wide Baggy Jeans', price: 2200 });
    const sameCategoryOtherGender = product('gender', { name: 'Slim Jeans', gender: 'Female', price: 2100 });
    const other = product('other', { name: 'Silk Saree', categoryId: 'saree', subcategoryId: 'silk', gender: 'Female', price: 15000, colors: [colour('Red')] });
    expect(ids(findSimilarProducts(target, [other, sameCategoryOtherGender, close, target], 3))).toEqual(['close', 'gender', 'other']);
  });

  it('never returns the product itself, and returns at most k', () => {
    const target = product('t');
    const catalogue = [target, ...Array.from({ length: 20 }, (_, i) => product(`p${i}`))];
    const result = findSimilarProducts(target, catalogue, 5);
    expect(result).toHaveLength(5);
    expect(ids(result)).not.toContain('t');
    expect(findSimilarProducts(target, catalogue)).toHaveLength(DEFAULT_K);
  });

  it('uses shared colours, hashtags and name words to pick between otherwise equal products', () => {
    const target = product('t', { name: 'Racing Bomber Jacket', hashtags: ['#racing', '#winter'], colors: [colour('White')] });
    const alike = product('alike', { name: 'Racing Varsity Jacket', hashtags: ['racing'], colors: [colour('White')] });
    const unlike = product('unlike', { name: 'Cargo Trousers', hashtags: ['summer'], colors: [colour('Green')] });
    expect(ids(findSimilarProducts(target, [unlike, alike], 2))).toEqual(['alike', 'unlike']);
  });

  it('puts products that cannot be bought after every available one, but still uses them to fill the list', () => {
    const target = product('t');
    const soldOutTwin = product('soldout', { outOfStock: true });
    const available = product('available', { categoryId: 'tops', subcategoryId: 'tee', gender: 'Female', price: 500 });
    expect(ids(findSimilarProducts(target, [soldOutTwin, available], 2))).toEqual(['available', 'soldout']);
  });

  it('is stable: equal distances are ordered by id, whatever order the catalogue arrives in', () => {
    const target = product('t');
    const twins = ['c', 'a', 'b'].map((id) => product(id));
    expect(ids(findSimilarProducts(target, twins, 3))).toEqual(['a', 'b', 'c']);
    expect(ids(findSimilarProducts(target, [...twins].reverse(), 3))).toEqual(['a', 'b', 'c']);
  });

  it('copes with missing fields and an empty or invalid catalogue', () => {
    const bare = { id: 'bare' };
    expect(findSimilarProducts(bare, [bare, { id: 'x' }, null], 4).map((p) => p.id)).toEqual(['x']);
    expect(findSimilarProducts(null, [bare])).toEqual([]);
    expect(findSimilarProducts(bare, undefined)).toEqual([]);
    expect(findSimilarProducts(bare, [bare])).toEqual([]);
    expect(findSimilarProducts(bare, [product('x')], 0)).toEqual([]);
  });
});

describe('productDistance', () => {
  it('is 0 for the same product and grows as the price moves apart', () => {
    const a = describeProduct(product('a', { price: 1000 }));
    expect(productDistance(a, a, 3)).toBe(0);
    const near = describeProduct(product('b', { price: 1200 }));
    const far = describeProduct(product('c', { price: 9000 }));
    expect(productDistance(a, near, 3)).toBeLessThan(productDistance(a, far, 3));
  });
});
