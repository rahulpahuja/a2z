import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Renders the real HomePage with its heavy neighbours stubbed, to prove the saved
// layout (order, visibility, pins) really drives what the storefront shows.
let layout;
const stub = (name) => ({ default: () => <div data-testid={name} /> });
vi.mock('../components/CartIconButton.jsx', () => stub('cart'));
vi.mock('../components/ProfileButton.jsx', () => stub('profile'));
vi.mock('../components/SiteFooter.jsx', () => stub('footer'));
vi.mock('../components/MobileNavDrawer.jsx', () => stub('drawer'));
vi.mock('../components/MobileQuickNav.jsx', () => stub('quicknav'));
vi.mock('../components/SearchBar.jsx', () => stub('search'));
vi.mock('../components/TrendingProducts.jsx', () => stub('trending'));
vi.mock('../components/HomeCollections.jsx', () => stub('collections'));
vi.mock('../components/BrandName.jsx', () => ({ default: () => <span>brand</span> }));
vi.mock('../components/ProductCardImage.jsx', () => ({ default: () => <i /> }));
vi.mock('../services/analytics.js', () => ({
  logSelectPromotion: vi.fn(), logSelectContent: vi.fn(), logSelectItem: vi.fn(), logVideoStart: vi.fn(),
}));
vi.mock('../services/carousel.js', () => ({ subscribeToCarousel: (cb) => { cb([]); return () => {}; } }));
vi.mock('../services/categoryBubbles.js', () => ({
  DEFAULT_CATEGORY_BUBBLES: [],
  subscribeToCategoryBubbles: (cb) => { cb([]); return () => {}; },
}));
vi.mock('../services/topNav.js', () => ({
  DEFAULT_TOP_NAV_LINKS: [],
  topNavLinkToPath: () => '/',
  subscribeToTopNav: (cb) => { cb([]); return () => {}; },
}));
vi.mock('../services/storeSettings.js', () => {
  const defaults = { homeProductsPerRow: 2, showCategoryBubbles: true, showBannerHint: false, mobileHeroHeightVh: 42 };
  return { DEFAULT_STORE_SETTINGS: defaults, subscribeToStoreSettings: (cb) => { cb(defaults); return () => {}; } };
});
vi.mock('../services/homeLayout.js', () => ({
  getCachedHomeLayout: () => layout,
  subscribeToHomeLayout: (cb) => { cb(layout, null, { cached: false }); return () => {}; },
}));
vi.mock('../context/ProductsContext.jsx', () => ({
  useProducts: () => ({
    products: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, name: `Product ${id}`, price: 10, image: `${id}.jpg` })),
  }),
}));
vi.mock('../context/StorefrontThemeContext.jsx', () => ({ useStorefrontTheme: () => ({ theme: { lookbookVideos: [] } }) }));

const { default: HomePage } = await import('./HomePage.jsx');
const { createDefaultHomeLayout, moveSection, updateSection } = await import('../utils/homeLayout.js');

const renderHome = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
const order = (container) => [...container.querySelectorAll('.home-layout-section')].map((n) => n.dataset.section);
const featuredNames = (container, sectionId) =>
  [...container.querySelector(`[data-section="${sectionId}"]`).querySelectorAll('h3')].map((n) => n.textContent);

beforeEach(() => {
  layout = createDefaultHomeLayout();
});

describe('HomePage driven by the saved layout', () => {
  it('renders every section in the default order', () => {
    const { container } = renderHome();
    expect(order(container)).toEqual(['hero', 'genderTiles', 'categoryBubbles', 'trending', 'collections', 'featured1', 'featured2']);
  });

  it('follows a reordered layout', () => {
    layout = moveSection(layout, 5, 0); // featured1 to the very top
    const { container } = renderHome();
    expect(order(container)[0]).toBe('featured1');
  });

  it('leaves out hidden sections', () => {
    layout = updateSection(layout, 'trending', { visible: false });
    const { container } = renderHome();
    expect(order(container)).not.toContain('trending');
  });

  it('applies size overrides as CSS variables on the section wrapper only', () => {
    layout = updateSection(layout, 'featured1', { padY: 8, cardWidth: 300 });
    const { container } = renderHome();
    const wrapper = container.querySelector('[data-section="featured1"]');
    expect(wrapper.style.getPropertyValue('--hl-pad-y')).toBe('8px');
    expect(wrapper.style.getPropertyValue('--hl-card-w')).toBe('300px');
    expect(container.querySelector('[data-section="featured2"]').getAttribute('style')).toBeNull();
  });

  it('pins and hides products in the featured rows', () => {
    layout = { ...layout, products: { top: ['e'], bottom: ['a'], hidden: ['b'] } };
    const { container } = renderHome();
    // row 1 = first 2 products of the ordered feed: e, c ; row 2 continues: d, f, a  (b hidden)
    expect(featuredNames(container, 'featured1').slice(0, 2)).toEqual(['Product e', 'Product c']);
    const row2 = featuredNames(container, 'featured2');
    expect(row2).toEqual(['Product d', 'Product f', 'Product a']);
    expect(container.textContent).not.toContain('Product b');
  });
});
