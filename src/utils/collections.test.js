import { describe, it, expect } from 'vitest';
import { DISPLAY_MODES, getDisplayMode, resolveCollectionCover, groupCollectionsForHome, collectionPath } from './collections.js';

const products = [
  { id: 'a', title: 'Alpha', images: ['https://cdn/a.webp'] },
  { id: 'b', title: 'Beta', image: 'https://cdn/b.webp' },
];
const base = { id: 'c1', name: 'Festive', productIds: ['a', 'b'], heroProductId: 'b' };

describe('getDisplayMode', () => {
  it('defaults old collections to expanded', () => {
    expect(getDisplayMode(base)).toBe(DISPLAY_MODES.EXPANDED);
    expect(getDisplayMode({ ...base, displayMode: 'collapsed' })).toBe(DISPLAY_MODES.COLLAPSED);
    expect(getDisplayMode({ ...base, displayMode: 'nonsense' })).toBe(DISPLAY_MODES.EXPANDED);
  });
});

describe('resolveCollectionCover', () => {
  it('prefers the uploaded cover, then the thumbnail product, then the first product', () => {
    expect(resolveCollectionCover({ ...base, coverImage: 'https://cdn/cover.webp' }, products).src).toBe('https://cdn/cover.webp');
    expect(resolveCollectionCover(base, products).src).toBe('https://cdn/b.webp');
    expect(resolveCollectionCover({ ...base, heroProductId: 'gone' }, products).src).toBe('https://cdn/a.webp');
    expect(resolveCollectionCover({ ...base, productIds: ['gone'] }, products)).toBeNull();
  });
});

describe('groupCollectionsForHome', () => {
  const expanded = { ...base, id: 'e1' };
  const collapsed = (id, productIds = ['a']) => ({ ...base, id, productIds, displayMode: 'collapsed' });

  it('keeps expanded rows apart and groups neighbouring collapsed ones', () => {
    const blocks = groupCollectionsForHome([collapsed('c1'), collapsed('c2'), expanded, collapsed('c3')], products);
    expect(blocks.map((b) => b.type)).toEqual(['tiles', 'row', 'tiles']);
    expect(blocks[0].collections.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('drops a collapsed collection whose products are all gone', () => {
    expect(groupCollectionsForHome([collapsed('c1', ['gone'])], products)).toEqual([]);
  });
});

describe('collectionPath', () => {
  it('encodes the id', () => {
    expect(collectionPath({ id: '-Nabc d' })).toBe('/collections/-Nabc%20d');
  });
});
