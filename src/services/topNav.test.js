import { describe, it, expect, beforeEach, vi } from 'vitest';
import { findNavLinkLabel, isAllProductsView, subscribeToTopNav, topNavLinkToPath, DEFAULT_TOP_NAV_LINKS } from './topNav.js';

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

describe('Style Blogs link', () => {
  beforeEach(() => {
    const store = new Map();
    vi.stubGlobal('localStorage', { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) });
  });

  const labels = (list) => list.map((l) => l.label);
  const saved = (value) => globalThis.localStorage.setItem('settings/topNav', JSON.stringify(value));
  const load = () => {
    let out;
    subscribeToTopNav((list) => { out = list; })();
    return out;
  };

  it('leads to the blog and sits right after New Arrivals by default', () => {
    expect(labels(DEFAULT_TOP_NAV_LINKS).slice(0, 2)).toEqual(['New Arrivals', 'Style Blogs']);
    expect(topNavLinkToPath({ id: 'nav_style_blogs', label: 'Style Blogs', type: 'blog' })).toBe('/blogs');
  });

  it('is added after New Arrivals to a saved list that predates it, and not twice', () => {
    saved([{ id: 'a', label: 'New Arrivals', type: 'all' }, { id: 'b', label: 'Kurtis', type: 'category', category: 'Kurti' }]);
    expect(labels(load())).toEqual(['New Arrivals', 'Style Blogs', 'Kurtis']);
    saved(load());
    expect(labels(load())).toEqual(['New Arrivals', 'Style Blogs', 'Kurtis']);
  });

  it('keeps a position the admin chose for it', () => {
    saved([{ id: 'a', label: 'New Arrivals', type: 'all' }, { id: 'b', label: 'Kurtis', type: 'category', category: 'Kurti' }, { id: 'c', label: 'Journal', type: 'blog' }]);
    expect(labels(load())).toEqual(['New Arrivals', 'Kurtis', 'Journal']);
  });
});
