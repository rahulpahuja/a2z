import { describe, it, expect } from 'vitest';
import {
  MAX_PINNED_PRODUCTS,
  SECTION_IDS,
  applyHomeProductOrder,
  clampSize,
  createDefaultHomeLayout,
  getPlacement,
  getSectionStyle,
  getVisibleSections,
  layoutsEqual,
  moveItem,
  moveSection,
  normalizeHomeLayout,
  normalizeProductPlacement,
  nudgePinned,
  placeProduct,
  pruneMissingProducts,
  updateSection,
} from './homeLayout.js';

const ids = (layout) => layout.sections.map((s) => s.id);
const products = (...list) => list.map((id) => ({ id }));
const order = (list) => list.map((p) => p.id);
const empty = { top: [], bottom: [], hidden: [] };

describe('normalizeHomeLayout', () => {
  it('falls back to the default layout for missing or malformed input', () => {
    for (const raw of [undefined, null, 'x', 5, [], true]) {
      const layout = normalizeHomeLayout(raw);
      expect(ids(layout)).toEqual(SECTION_IDS);
      expect(layout.sections.every((s) => s.visible)).toBe(true);
      expect(layout.products).toEqual(empty);
    }
  });

  it('keeps a valid custom order and flags', () => {
    const custom = ['featured1', ...SECTION_IDS.filter((id) => id !== 'featured1')];
    const layout = normalizeHomeLayout({
      sections: custom.map((id) => ({ id, visible: id !== 'featured1' })),
    });
    expect(ids(layout)).toEqual(custom);
    expect(layout.sections[0].visible).toBe(false);
  });

  it('drops unknown and duplicate section ids (first one wins) and appends nothing twice', () => {
    const layout = normalizeHomeLayout({
      sections: [{ id: 'trending', visible: false }, { id: 'nope' }, { id: 'trending', visible: true }, null, 'hero'],
    });
    expect(ids(layout).filter((id) => id === 'trending')).toHaveLength(1);
    expect(layout.sections.find((s) => s.id === 'trending').visible).toBe(false);
    expect(ids(layout).sort()).toEqual([...SECTION_IDS].sort());
  });

  it('inserts a section missing from stored data at its default position', () => {
    // A layout saved before `collections` existed: trending then featured1.
    const layout = normalizeHomeLayout({
      sections: SECTION_IDS.filter((id) => id !== 'collections').map((id) => ({ id })),
    });
    expect(ids(layout)).toEqual(SECTION_IDS);
    const reordered = normalizeHomeLayout({
      sections: ['featured1', 'trending', 'hero'].map((id) => ({ id })),
    });
    expect(ids(reordered).indexOf('collections')).toBe(ids(reordered).indexOf('trending') + 1);
  });

  it('accepts sections stored as an index-keyed object (Realtime Database sparse arrays)', () => {
    const swapped = ['trending', 'hero', ...SECTION_IDS.filter((id) => id !== 'trending' && id !== 'hero')];
    const keyed = Object.fromEntries(swapped.map((id, i) => [String(i), { id }]));
    expect(ids(normalizeHomeLayout({ sections: keyed }))).toEqual(swapped);
  });

  it('never leaves the page with every section hidden', () => {
    const layout = normalizeHomeLayout({ sections: SECTION_IDS.map((id) => ({ id, visible: false })) });
    expect(layout.sections.some((s) => s.visible)).toBe(true);
  });

  it('clamps sizes, nulls garbage, and drops sizes a section does not support', () => {
    const layout = normalizeHomeLayout({
      sections: [
        { id: 'trending', padY: -50, maxWidth: 99999, cardWidth: 'abc' },
        { id: 'hero', padY: 40, maxWidth: 900, cardWidth: 200 },
        { id: 'featured1', padY: '24', maxWidth: NaN, cardWidth: 250.6 },
      ],
    });
    const get = (id) => layout.sections.find((s) => s.id === id);
    expect(get('trending')).toMatchObject({ padY: 0, maxWidth: 1920, cardWidth: null });
    expect(get('hero')).toMatchObject({ padY: null, maxWidth: null, cardWidth: null });
    expect(get('featured1')).toMatchObject({ padY: 24, maxWidth: null, cardWidth: 251 });
  });

  it('sanitizes rev and updatedAt', () => {
    expect(normalizeHomeLayout({ rev: -3, updatedAt: 'x' })).toMatchObject({ rev: 0, updatedAt: 0 });
    expect(normalizeHomeLayout({ rev: 2.5 }).rev).toBe(0);
    expect(normalizeHomeLayout({ rev: 7, updatedAt: 123 })).toMatchObject({ rev: 7, updatedAt: 123 });
  });

  it('is idempotent', () => {
    const once = normalizeHomeLayout({
      rev: 3,
      sections: [{ id: 'lookbook', padY: 20 }, { id: 'hero' }],
      products: { top: ['a'], bottom: ['b'], hidden: ['c'] },
    });
    expect(normalizeHomeLayout(once)).toEqual(once);
  });
});

describe('normalizeProductPlacement', () => {
  it('returns empty lists when products is missing (Firebase drops empty arrays)', () => {
    expect(normalizeProductPlacement(undefined)).toEqual(empty);
    expect(normalizeProductPlacement({})).toEqual(empty);
  });

  it('keeps an id in one list only: hidden beats top beats bottom', () => {
    const out = normalizeProductPlacement({ top: ['a', 'b'], bottom: ['b', 'c'], hidden: ['a', 'c'] });
    expect(out).toEqual({ hidden: ['a', 'c'], top: ['b'], bottom: [] });
  });

  it('coerces numeric ids, drops junk and duplicates, and caps length', () => {
    const out = normalizeProductPlacement({
      top: [1, '1', 2, null, {}, '', 'x'.repeat(200), ['q']],
      bottom: Array.from({ length: MAX_PINNED_PRODUCTS + 50 }, (_, i) => `p${i}`),
    });
    expect(out.top).toEqual(['1', '2']);
    expect(out.bottom).toHaveLength(MAX_PINNED_PRODUCTS);
  });
});

describe('applyHomeProductOrder', () => {
  const list = products('a', 'b', 'c', 'd', 'e');

  it('returns the list untouched (same reference) when nothing is pinned or hidden', () => {
    expect(applyHomeProductOrder(list, empty)).toBe(list);
    expect(applyHomeProductOrder(list, undefined)).toBe(list);
  });

  it('puts top pins first in pin order and bottom pins last in pin order', () => {
    const out = applyHomeProductOrder(list, { top: ['d', 'c'], bottom: ['a', 'b'], hidden: [] });
    expect(order(out)).toEqual(['d', 'c', 'e', 'a', 'b']);
  });

  it('removes hidden products from the feed only', () => {
    const out = applyHomeProductOrder(list, { top: [], bottom: [], hidden: ['b', 'd'] });
    expect(order(out)).toEqual(['a', 'c', 'e']);
    expect(order(list)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('ignores ids that no longer match a live product', () => {
    const out = applyHomeProductOrder(list, { top: ['ghost', 'c'], bottom: ['gone'], hidden: ['also-gone'] });
    expect(order(out)).toEqual(['c', 'a', 'b', 'd', 'e']);
  });

  it('matches numeric product ids against stored string ids', () => {
    const out = applyHomeProductOrder([{ id: 1 }, { id: 2 }, { id: 3 }], { top: ['3'], bottom: [], hidden: [] });
    expect(out.map((p) => p.id)).toEqual([3, 1, 2]);
  });

  it('never duplicates or loses a product, even with a conflicting placement', () => {
    const out = applyHomeProductOrder(list, { top: ['a'], bottom: ['a', 'b'], hidden: [] });
    expect(order(out).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(order(out)[0]).toBe('a');
  });

  it('copes with an empty or non-array catalog', () => {
    expect(applyHomeProductOrder([], { top: ['a'], bottom: [], hidden: [] })).toEqual([]);
    expect(applyHomeProductOrder(undefined, empty)).toEqual([]);
  });

  it('keeps one entry when the catalog itself repeats an id', () => {
    const out = applyHomeProductOrder([{ id: 'a' }, { id: 'a' }, { id: 'b' }], { top: ['a'], bottom: [], hidden: [] });
    expect(order(out).filter((id) => id === 'a')).toHaveLength(1 + 0);
  });
});

describe('placement edits', () => {
  it('pins to the very top, appends to the bottom, and moves between lists', () => {
    let p = placeProduct(empty, 'a', 'top');
    p = placeProduct(p, 'b', 'top');
    expect(p.top).toEqual(['b', 'a']);
    p = placeProduct(p, 'c', 'bottom');
    p = placeProduct(p, 'd', 'bottom');
    expect(p.bottom).toEqual(['c', 'd']);
    p = placeProduct(p, 'a', 'bottom');
    expect(p).toMatchObject({ top: ['b'], bottom: ['c', 'd', 'a'] });
    p = placeProduct(p, 'a', 'hidden');
    expect(p).toMatchObject({ bottom: ['c', 'd'], hidden: ['a'] });
    p = placeProduct(p, 'a', null);
    expect(getPlacement(p, 'a')).toBeNull();
  });

  it('returns the same object for a no-op', () => {
    const p = placeProduct(empty, 'a', 'top');
    expect(placeProduct(p, 'a', 'top')).toBe(p);
    expect(placeProduct(empty, 'z', null)).toBe(empty);
  });

  it('stops at the pin cap instead of growing without bound', () => {
    let p = empty;
    for (let i = 0; i < MAX_PINNED_PRODUCTS; i += 1) p = placeProduct(p, `p${i}`, 'bottom');
    expect(placeProduct(p, 'overflow', 'bottom')).toBe(p);
  });

  it('nudges within a pinned list and stops at the ends', () => {
    const p = { top: ['a', 'b', 'c'], bottom: [], hidden: ['h'] };
    expect(nudgePinned(p, 'b', -1).top).toEqual(['b', 'a', 'c']);
    expect(nudgePinned(p, 'c', 1)).toBe(p);
    expect(nudgePinned(p, 'a', -1)).toBe(p);
    expect(nudgePinned(p, 'h', 1)).toBe(p);
    expect(nudgePinned(p, 'unknown', 1)).toBe(p);
  });

  it('prunes ids of deleted products', () => {
    const p = { top: ['a', 'x'], bottom: ['y'], hidden: ['b'] };
    expect(pruneMissingProducts(p, products('a', 'b'))).toEqual({ top: ['a'], bottom: [], hidden: ['b'] });
  });
});

describe('section edits', () => {
  it('reorders sections and ignores out-of-range or identical moves', () => {
    const layout = createDefaultHomeLayout();
    expect(ids(moveSection(layout, 0, 2)).slice(0, 3)).toEqual(['blogs', 'genderTiles', 'hero']);
    expect(moveSection(layout, 0, 0)).toBe(layout);
    expect(moveSection(layout, 0, -1)).toBe(layout);
    expect(moveSection(layout, 0, 99)).toBe(layout);
  });

  it('moveItem does not mutate its input', () => {
    const list = [1, 2, 3];
    expect(moveItem(list, 0, 2)).toEqual([2, 3, 1]);
    expect(list).toEqual([1, 2, 3]);
  });

  it('refuses to hide the last visible section', () => {
    let layout = createDefaultHomeLayout();
    layout = {
      ...layout,
      sections: layout.sections.map((s) => ({ ...s, visible: s.id === 'hero' })),
    };
    expect(updateSection(layout, 'hero', { visible: false })).toBe(layout);
    expect(updateSection(layout, 'trending', { visible: true }).sections.find((s) => s.id === 'trending').visible).toBe(true);
  });

  it('clamps edited sizes and ignores unsupported fields', () => {
    const layout = createDefaultHomeLayout();
    const edited = updateSection(layout, 'trending', { cardWidth: 9999, padY: '' });
    expect(edited.sections.find((s) => s.id === 'trending')).toMatchObject({ cardWidth: 480, padY: null });
    const hero = updateSection(layout, 'hero', { padY: 50 });
    expect(hero.sections.find((s) => s.id === 'hero').padY).toBeNull();
  });

  it('does not mutate the previous layout', () => {
    const layout = createDefaultHomeLayout();
    const snapshot = JSON.stringify(layout);
    updateSection(layout, 'trending', { visible: false, cardWidth: 200 });
    moveSection(layout, 0, 3);
    expect(JSON.stringify(layout)).toBe(snapshot);
  });
});

describe('clampSize', () => {
  it('maps empty values to null and rounds/clamps numbers', () => {
    expect(clampSize('padY', '')).toBeNull();
    expect(clampSize('padY', null)).toBeNull();
    expect(clampSize('padY', undefined)).toBeNull();
    expect(clampSize('padY', 'x')).toBeNull();
    expect(clampSize('padY', Infinity)).toBeNull();
    expect(clampSize('cardWidth', 10)).toBe(120);
    expect(clampSize('cardWidth', 300.4)).toBe(300);
    expect(clampSize('unknown', 5)).toBeNull();
  });
});

describe('layoutsEqual', () => {
  it('ignores rev/updatedAt but notices real edits', () => {
    const a = createDefaultHomeLayout();
    expect(layoutsEqual(a, { ...a, rev: 9, updatedAt: 5 })).toBe(true);
    expect(layoutsEqual(a, moveSection(a, 0, 1))).toBe(false);
    expect(layoutsEqual(a, updateSection(a, 'trending', { padY: 10 }))).toBe(false);
  });
});

describe('getSectionStyle', () => {
  it('is empty for default sizes so the page renders exactly as before', () => {
    expect(getSectionStyle({ padY: null, maxWidth: null, cardWidth: null })).toEqual({ style: {}, attrs: {} });
    expect(getSectionStyle(undefined)).toEqual({ style: {}, attrs: {} });
  });

  it('emits CSS variables and marker attributes only for the sizes that are set', () => {
    expect(getSectionStyle({ padY: 0, maxWidth: 960, cardWidth: null })).toEqual({
      style: { '--hl-pad-y': '0px', '--hl-max-w': '960px' },
      attrs: { 'data-hl-pad': '', 'data-hl-width': '' },
    });
  });
});

describe('getVisibleSections', () => {
  it('returns only visible sections in order', () => {
    const layout = updateSection(moveSection(createDefaultHomeLayout(), 0, 1), 'trending', { visible: false });
    const visible = getVisibleSections(layout).map((s) => s.id);
    expect(visible[0]).toBe('blogs');
    expect(visible).not.toContain('trending');
  });
});

describe('blogs section', () => {
  it('is on by default, right after the hero banner', () => {
    expect(ids(createDefaultHomeLayout()).slice(0, 2)).toEqual(['hero', 'blogs']);
    expect(createDefaultHomeLayout().sections[1].visible).toBe(true);
  });

  it('is added after the hero for a layout saved before it existed, keeping the saved order', () => {
    const saved = SECTION_IDS.filter((id) => id !== 'blogs');
    const layout = normalizeHomeLayout({ sections: saved.map((id) => ({ id })) });
    expect(ids(layout)).toEqual(SECTION_IDS);
    const reordered = ['featured1', ...saved.filter((id) => id !== 'featured1')];
    expect(ids(normalizeHomeLayout({ sections: reordered.map((id) => ({ id })) }))[0]).toBe('featured1');
  });

  it('can be hidden and moved to the very top', () => {
    const layout = createDefaultHomeLayout();
    expect(updateSection(layout, 'blogs', { visible: false }).sections[1].visible).toBe(false);
    expect(ids(moveSection(layout, 1, 0))[0]).toBe('blogs');
  });
});
