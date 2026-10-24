import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const analytics = {
  logBlogProductClick: vi.fn(),
  logBlogProductUnavailableView: vi.fn(),
  logBlogCollectionClick: vi.fn(),
  logBlogToc: vi.fn(),
  logBlogCta: vi.fn(),
  logBlogShare: vi.fn(),
  logBlogCardClick: vi.fn(),
  logBlogView: vi.fn(),
  logBlogReadDepth: vi.fn(),
};
vi.mock('../../services/analytics.js', () => analytics);
vi.mock('../../context/CartContext.jsx', () => ({ formatCurrency: (n) => `₹${n}` }));
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../ProductImage.jsx', () => ({ default: ({ alt }) => <img alt={alt} /> }));

const catalogue = {
  products: [
    { id: 'p1', name: 'Rider Jacket', price: 1000, category: 'Jackets', gender: 'Male', colors: [{ name: 'Black', sizes: [{ size: 'M', stock: 5 }] }], image: 'a.jpg' },
    { id: 'p2', name: 'Baggy Jeans', price: 2000, discountUnit: 'PERCENTAGE', discountValue: 50, category: 'Jeans', outOfStock: true, image: 'b.jpg' },
  ],
  loading: false,
};
vi.mock('../../context/ProductsContext.jsx', () => ({ useProducts: () => catalogue }));
vi.mock('../../services/collections.js', () => ({
  subscribeToCollections: (cb) => {
    cb([
      { id: 'c1', name: 'Winter Edit', published: true, productIds: ['p1'] },
      { id: 'c2', name: 'Hidden', published: false, productIds: ['p1'] },
    ]);
    return () => {};
  },
}));

const { default: BlogRenderer } = await import('./BlogRenderer.jsx');
const { default: BlogArticle } = await import('./BlogArticle.jsx');
const { normalizePost } = await import('../../utils/blog/post.js');

const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) });
const p = (...c) => ({ type: 'paragraph', content: c });
const h = (level, text) => ({ type: 'heading', attrs: { level }, content: [t(text)] });
const doc = (...content) => ({ type: 'doc', content });
const renderDoc = (d, post) => render(<MemoryRouter><BlogRenderer doc={d} post={post} /></MemoryRouter>);

beforeEach(() => Object.values(analytics).forEach((fn) => fn.mockReset()));

describe('BlogRenderer', () => {
  it('renders text, marks, lists, quotes and rules as real elements', () => {
    const { container } = renderDoc(doc(
      h(2, 'Title'),
      p(t('bold', [{ type: 'bold' }]), t(' and '), t('italic', [{ type: 'italic' }]), t(' '), t('code', [{ type: 'code' }])),
      { type: 'bulletList', content: [{ type: 'listItem', content: [p(t('one'))] }] },
      { type: 'orderedList', attrs: { start: 3 }, content: [{ type: 'listItem', content: [p(t('three'))] }] },
      { type: 'blockquote', content: [p(t('quoted'))] },
      { type: 'horizontalRule' }
    ));
    expect(container.querySelector('h2').textContent).toBe('Title');
    expect(container.querySelector('strong').textContent).toBe('bold');
    expect(container.querySelector('em')).toBeTruthy();
    expect(container.querySelector('p code')).toBeTruthy();
    expect(container.querySelector('ul li').textContent).toBe('one');
    expect(container.querySelector('ol').getAttribute('start')).toBe('3');
    expect(container.querySelector('blockquote').textContent).toBe('quoted');
    expect(container.querySelector('hr')).toBeTruthy();
  });

  it('never outputs a script, an event handler or a javascript: URL, whatever the document contains', () => {
    const { container } = renderDoc(doc(
      { type: 'script', content: [t('alert(1)')] },
      p(t('click', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }])),
      { type: 'image', attrs: { src: 'javascript:alert(1)', alt: 'x', onerror: 'alert(1)' } },
      { type: 'image', attrs: { src: 'https://cdn.test/ok.jpg', alt: 'ok', onerror: 'alert(1)' } },
      { type: 'video', attrs: { src: 'https://evil.test/embed' } },
      p(t('<img src=x onerror=alert(1)>'))
    ));
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('a[href^="javascript"]')).toBeNull();
    expect(container.querySelector('img[src^="javascript"]')).toBeNull();
    expect(container.querySelector('[onerror]')).toBeNull();
    expect(container.querySelector('img[src="https://cdn.test/ok.jpg"]')).toBeTruthy();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('opens external links safely in a new tab and keeps internal links in the app', () => {
    renderDoc(doc(p(t('out', [{ type: 'link', attrs: { href: 'https://example.com/a' } }]), t(' '), t('in', [{ type: 'link', attrs: { href: '/products' } }]))));
    const out = screen.getByRole('link', { name: 'out' });
    expect(out).toHaveAttribute('target', '_blank');
    expect(out.getAttribute('rel')).toBe('noopener noreferrer');
    const internal = screen.getByRole('link', { name: 'in' });
    expect(internal).toHaveAttribute('href', '/products');
    expect(internal).not.toHaveAttribute('target');
  });

  it('embeds YouTube privately from its id and lazy-loads images', () => {
    const { container } = renderDoc(doc(
      { type: 'video', attrs: { src: 'https://youtu.be/dQw4w9WgXcQ', title: 'Lookbook' } },
      { type: 'image', attrs: { src: 'https://cdn.test/a.jpg', alt: 'A', caption: 'A caption' } },
      { type: 'gallery', attrs: { images: [{ src: 'https://cdn.test/1.jpg', alt: '1' }, { src: 'https://cdn.test/2.jpg', alt: '2' }] } }
    ));
    const frame = container.querySelector('iframe');
    expect(frame.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(frame).toHaveAttribute('title', 'Lookbook');
    expect(container.querySelector('figcaption').textContent).toBe('A caption');
    container.querySelectorAll('img').forEach((img) => expect(img).toHaveAttribute('loading', 'lazy'));
    expect(container.querySelectorAll('.blog-gallery img')).toHaveLength(2);
  });

  it('renders tables inside a scrollable, labelled region with header cells', () => {
    const { container } = renderDoc(doc({
      type: 'table',
      content: [
        { type: 'tableRow', content: [{ type: 'tableHeader', attrs: { colspan: 1, rowspan: 1 }, content: [p(t('Size'))] }] },
        { type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [p(t('M'))] }] },
      ],
    }));
    expect(screen.getByRole('region', { name: 'Table' })).toHaveAttribute('tabindex', '0');
    expect(container.querySelector('th[scope="col"]').textContent).toBe('Size');
    expect(container.querySelector('td').textContent).toBe('M');
  });

  it('renders callouts as notes with a tone', () => {
    const { container } = renderDoc(doc({ type: 'callout', attrs: { tone: 'tip' }, content: [p(t('Wash cold'))] }));
    expect(screen.getByRole('note').textContent).toContain('Wash cold');
    expect(container.querySelector('.blog-callout--tip')).toBeTruthy();
  });

  it('gives headings stable anchors that match the table of contents', () => {
    const { container } = renderDoc(doc(h(2, 'Fit guide'), h(3, 'Fit guide'), h(2, '   ')));
    const ids = [...container.querySelectorAll('h2, h3')].map((n) => n.id);
    expect(ids).toEqual(['fit-guide', 'fit-guide-2', '']);
  });
});

describe('product cards in an article', () => {
  it('shows live name, price, availability and a link to the product page', () => {
    renderDoc(doc({ type: 'productCard', attrs: { productId: 'p1' } }));
    const card = screen.getByRole('complementary', { name: 'Product: Rider Jacket' });
    expect(card.textContent).toContain('₹1000');
    expect(card.textContent).toContain('In stock');
    expect(within(card).getByRole('link', { name: /View Product/ })).toHaveAttribute('href', '/products/p1');
  });

  it('shows the current discounted price and marks unavailable products', () => {
    renderDoc(doc({ type: 'productCard', attrs: { productId: 'p2' } }));
    const card = screen.getByRole('complementary', { name: 'Product: Baggy Jeans' });
    expect(card.textContent).toContain('₹1000');
    expect(card.querySelector('s').textContent).toBe('₹2000');
    expect(card.textContent).toContain('Currently unavailable');
  });

  it('turns a deleted product into a notice with a way back to the shop, and reports it', () => {
    renderDoc(doc({ type: 'productCard', attrs: { productId: 'gone' } }));
    expect(screen.getByText('This product is no longer available.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse all products' })).toHaveAttribute('href', '/products');
    expect(analytics.logBlogProductUnavailableView).not.toHaveBeenCalled(); // no tracker outside an article
  });

  it('tracks clicks on a product card from inside an article', () => {
    const post = normalizePost({ id: 'b1', slug: 'x', title: 'X', body: JSON.stringify(doc({ type: 'productCard', attrs: { productId: 'p1' } })) });
    render(<MemoryRouter><BlogArticle post={post} /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole('link', { name: /View Product/ })[0]);
    expect(analytics.logBlogProductClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }), expect.objectContaining({ id: 'p1' }), 'inline');
  });

  it('shows only published collections', () => {
    renderDoc(doc({ type: 'collectionCard', attrs: { collectionId: 'c1' } }, ), undefined);
    expect(screen.getByRole('complementary', { name: 'Collection: Winter Edit' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explore Collection/ })).toHaveAttribute('href', '/collections/c1');
  });

  it('renders nothing for an unpublished collection', () => {
    const { container } = renderDoc(doc({ type: 'collectionCard', attrs: { collectionId: 'c2' } }));
    expect(container.querySelector('.blog-collection')).toBeNull();
  });
});

describe('comparison', () => {
  it('builds a table only from catalogue facts, with a dash where a product has none', () => {
    renderDoc(doc({ type: 'comparison', attrs: { productIds: ['p1', 'p2'] } }));
    const table = screen.getByRole('table');
    const rows = Object.fromEntries([...table.querySelectorAll('tbody tr')].map((tr) => [tr.querySelector('th').textContent, [...tr.querySelectorAll('td')].map((td) => td.textContent)]));
    expect(rows.Price).toEqual(['₹1000', '₹1000']);
    expect(rows.Colours).toEqual(['Black', '—']);
    expect(rows.Availability).toEqual(['In stock', 'Currently unavailable']);
    expect(rows.Care).toBeUndefined(); // nobody entered care details, so there is no row
  });

  it('falls back to the article\'s own products when none are chosen', () => {
    renderDoc(doc({ type: 'comparison', attrs: { productIds: [] } }), { productIds: ['p1', 'p2'] });
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('explains itself when fewer than two products are still available', () => {
    renderDoc(doc({ type: 'comparison', attrs: { productIds: ['p1', 'gone'] } }));
    expect(screen.getByRole('note').textContent).toMatch(/at least two products/);
  });
});

describe('BlogArticle', () => {
  const body = JSON.stringify(doc(h(2, 'One'), p(t('a')), h(2, 'Two'), p(t('b')), h(3, 'Three'), { type: 'productCard', attrs: { productId: 'p1' } }));
  const post = normalizePost({ id: 'b1', slug: 'guide', title: 'The Guide', body, author: 'Rahul', publishedAt: Date.UTC(2026, 9, 24), productIds: ['p1', 'p2'], heroProductId: 'p2', collectionIds: ['c1'], tags: ['winter'], type: 'guide', status: 'published' });
  const entries = [
    { id: 'b1', slug: 'guide', title: 'The Guide', tags: ['winter'], publishedAt: 5, excerpt: '', readingMinutes: 1, type: 'guide', productCount: 2 },
    { id: 'b0', slug: 'older', title: 'Older one', tags: ['winter'], publishedAt: 1, excerpt: '', readingMinutes: 2, type: 'general', productCount: 0 },
    { id: 'b9', slug: 'newer', title: 'Newer one', tags: [], publishedAt: 9, excerpt: '', readingMinutes: 2, type: 'general', productCount: 0 },
  ];
  const view = (props = {}) => render(<MemoryRouter><BlogArticle post={post} category={{ id: 'style', name: 'Style' }} entries={entries} {...props} /></MemoryRouter>);

  it('shows the heading, byline, breadcrumbs and a table of contents with working anchors', () => {
    view();
    expect(screen.getByRole('heading', { level: 1, name: 'The Guide' })).toBeInTheDocument();
    expect(screen.getByText(/By Rahul · 24 October 2026/)).toBeInTheDocument();
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'Style' })).toHaveAttribute('href', '/blogs?category=style');
    const toc = screen.getByRole('navigation', { name: 'Table of contents' });
    Element.prototype.scrollIntoView = vi.fn();
    fireEvent.click(within(toc).getByRole('link', { name: 'Two' }));
    expect(analytics.logBlogToc).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1' }), 'two');
  });

  it('shops only the products not already placed in the text, hero product first', () => {
    view();
    const section = screen.getByRole('heading', { name: 'Shop the guide' }).closest('section');
    const names = within(section).getAllByRole('complementary').map((n) => n.getAttribute('aria-label'));
    expect(names).toEqual(['Product: Baggy Jeans']); // Rider Jacket is already inline
  });

  it('lists related collections, tags and the previous/next articles', () => {
    view();
    expect(screen.getByRole('complementary', { name: 'Collection: Winter Edit' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#winter' })).toHaveAttribute('href', '/blogs?tag=winter');
    const nav = screen.getByRole('navigation', { name: 'More articles' });
    expect(within(nav).getByRole('link', { name: /Older one/ })).toHaveAttribute('href', '/blogs/older');
    expect(within(nav).getByRole('link', { name: /Newer one/ })).toHaveAttribute('href', '/blogs/newer');
    fireEvent.click(within(nav).getByRole('link', { name: /Older one/ }));
    expect(analytics.logBlogCardClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'b0' }), 'prev_next');
  });

  it('tracks the shopping calls to action and shares', async () => {
    const original = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue() }, configurable: true });
    view();
    fireEvent.click(screen.getByRole('link', { name: 'Shop all products' }));
    expect(analytics.logBlogCta).toHaveBeenCalledWith(expect.anything(), 'shop_all');
    fireEvent.click(screen.getByRole('link', { name: 'WhatsApp' }));
    expect(analytics.logBlogShare).toHaveBeenCalledWith(expect.anything(), 'whatsapp');
    await fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await vi.waitFor(() => expect(analytics.logBlogShare).toHaveBeenCalledWith(expect.anything(), 'copied'));
    Object.defineProperty(navigator, 'clipboard', { value: original, configurable: true });
  });

  it('preview mode tracks nothing and hides "keep reading"', () => {
    view({ preview: true });
    fireEvent.click(screen.getByRole('link', { name: 'Shop all products' }));
    fireEvent.click(screen.getAllByRole('link', { name: /View Product/ })[0]);
    expect(analytics.logBlogCta).not.toHaveBeenCalled();
    expect(analytics.logBlogProductClick).not.toHaveBeenCalled();
    expect(screen.queryByRole('navigation', { name: 'More articles' })).toBeNull();
  });

  it('works for a bare draft with no cover, author, tags or related content', () => {
    const bare = normalizePost({ id: 'd1', slug: 'bare', title: 'Bare', body: JSON.stringify(doc(p(t('Hi')))) });
    render(<MemoryRouter><BlogArticle post={bare} preview /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Bare' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Table of contents' })).toBeNull();
    expect(screen.getByText(/Not published yet/)).toBeInTheDocument();
  });
});
