import { describe, it, expect } from 'vitest';
import { resolveRouteSeo, SITE_URL } from './routes.js';
import { buildProductHead } from './productHead.js';
import { injectHeadIntoHtml, renderHeadTags } from './head.js';
import { applyPageMeta, pageMetaKey, sanitizeMetaTags } from './pageMeta.js';

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta name="description" content="site default" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://www.thea2zcollection.com/" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://www.thea2zcollection.com/" />
    <title>A2Z Collection</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

const product = {
  id: 'prod_1',
  title: 'Rani Kurti <Set>',
  description: 'A soft cotton kurti set.',
  price: 1000,
  sku: 'A2Z-1',
  categoryTitle: 'Kurti',
  images: ['https://cdn.example.com/a.jpg'],
  colors: [{ name: 'Pink', sizes: [{ size: 'M', stock: 2 }] }],
};

const reviews = [
  { id: 'r1', name: 'Asha', rating: 5, body: 'Lovely fit', helpful: 1, createdAtMs: 1700000000000 },
  { id: 'r2', name: 'Meera', rating: 3, body: 'Okay', helpful: 4, createdAtMs: 1700000000000 },
];

describe('resolveRouteSeo', () => {
  it('serves indexable pages with a canonical for their own path', () => {
    const { status, head } = resolveRouteSeo('/faqs/');
    expect(status).toBe(200);
    expect(head.canonical).toBe(`${SITE_URL}/faqs`);
    expect(head.robots).toBe('index, follow');
  });

  it('marks transactional pages noindex', () => {
    expect(resolveRouteSeo('/cart').head.robots).toBe('noindex, nofollow');
  });

  it('returns a real 404 with no canonical for unknown paths', () => {
    const { status, head } = resolveRouteSeo('/no-such-page');
    expect(status).toBe(404);
    expect(head.canonical).toBeNull();
    expect(head.robots).toBe('noindex, nofollow');
  });

  it('keeps the admin area out of the index', () => {
    expect(resolveRouteSeo('/super/products').head.robots).toBe('noindex, nofollow');
  });
});

describe('buildProductHead', () => {
  it('uses the product price, availability and canonical', () => {
    const head = buildProductHead(product, { reviews, now: new Date('2026-01-01') });
    const schema = head.jsonLd[0];
    expect(schema['@type']).toBe('Product');
    expect(schema.offers.price).toBe(1000);
    expect(schema.offers.priceCurrency).toBe('INR');
    expect(schema.offers.availability).toBe('https://schema.org/InStock');
    expect(head.canonical).toBe(`${SITE_URL}/products/prod_1`);
  });

  it('reports out of stock when the product is flagged or every colour is empty', () => {
    const flagged = buildProductHead({ ...product, outOfStock: true }, {});
    expect(flagged.jsonLd[0].offers.availability).toBe('https://schema.org/OutOfStock');
    const emptyColours = buildProductHead({ ...product, colors: [{ name: 'Pink', sizes: [{ size: 'M', stock: 0 }] }] }, {});
    expect(emptyColours.jsonLd[0].offers.availability).toBe('https://schema.org/OutOfStock');
  });

  it('adds aggregate rating and reviews only when reviews exist, most helpful first', () => {
    const withReviews = buildProductHead(product, { reviews });
    expect(withReviews.jsonLd[0].aggregateRating).toMatchObject({ ratingValue: 4, reviewCount: 2 });
    expect(withReviews.jsonLd[0].review[0].author.name).toBe('Meera');

    const without = buildProductHead(product, { reviews: [] });
    expect(without.jsonLd[0].aggregateRating).toBeUndefined();
  });

  it('adds FAQPage only when there are FAQs and always adds breadcrumbs', () => {
    const plain = buildProductHead(product, {});
    expect(plain.jsonLd.map((s) => s['@type'])).toEqual(['Product', 'BreadcrumbList']);
    const withFaqs = buildProductHead(product, { faqs: [{ question: 'Is it washable?', answer: 'Yes.' }] });
    expect(withFaqs.jsonLd[2]['@type']).toBe('FAQPage');
  });

  it('truncates long descriptions and escapes the crawlable body copy', () => {
    const head = buildProductHead({ ...product, description: 'x'.repeat(400) }, {});
    expect(head.description.length).toBeLessThanOrEqual(160);
    const escaped = buildProductHead(product, {});
    expect(escaped.noscript).toContain('Rani Kurti &lt;Set&gt;');
  });
});

describe('injectHeadIntoHtml', () => {
  it('replaces the site-wide defaults instead of duplicating them', () => {
    const head = resolveRouteSeo('/faqs').head;
    const html = injectHeadIntoHtml(INDEX_HTML, head);
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html).toContain('<title>FAQs | A2Z Collection</title>');
    expect(html).not.toContain('site default');
  });

  it('drops the homepage canonical on a 404', () => {
    const html = injectHeadIntoHtml(INDEX_HTML, resolveRouteSeo('/missing').head);
    expect(html).not.toContain('rel="canonical"');
    expect(html).toContain('noindex, nofollow');
  });

  it('keeps JSON-LD from closing its script tag early', () => {
    const head = buildProductHead({ ...product, title: '</script><b>x' }, {});
    expect(renderHeadTags(head)).not.toContain('</script><b>');
  });

  it('inserts crawlable copy at the app mount point', () => {
    const head = buildProductHead(product, {});
    const html = injectHeadIntoHtml(INDEX_HTML, head);
    expect(html.indexOf('<noscript>')).toBeLessThan(html.indexOf('<div id="root">'));
  });

  it('returns the HTML unchanged when there is no head', () => {
    expect(injectHeadIntoHtml(INDEX_HTML, null)).toBe(INDEX_HTML);
  });
});

describe('page meta overrides', () => {
  const base = resolveRouteSeo('/faqs').head;

  it('leaves the head alone without an override', () => {
    expect(applyPageMeta(base, null)).toBe(base);
  });

  it('replaces the title and description, keeping defaults for blanks', () => {
    const head = applyPageMeta(base, { title: ' Custom ', description: '', metaTags: [] });
    expect(head.title).toBe('Custom');
    expect(head.description).toBe(base.description);
  });

  it('drops malformed tags and keeps the last of a repeated name', () => {
    expect(
      sanitizeMetaTags([
        { attr: 'name', key: 'keywords', content: 'a' },
        { attr: 'name', key: 'keywords', content: 'b' },
        { attr: 'name', key: 'bad key', content: 'x' },
        { attr: 'http-equiv', key: 'refresh', content: '0' },
        { attr: 'name', key: 'empty', content: ' ' },
      ])
    ).toEqual([{ attr: 'name', key: 'keywords', content: 'b' }]);
  });

  it('renders custom tags and lets them replace the page default and index.html', () => {
    const head = applyPageMeta(base, {
      metaTags: [
        { attr: 'name', key: 'robots', content: 'noindex' },
        { attr: 'name', key: 'keywords', content: 'kurti, indore' },
      ],
    });
    const html = injectHeadIntoHtml(INDEX_HTML.replace('<title>', '<meta name="keywords" content="old" />\n<title>'), head);
    expect(html.match(/name="robots"/g)).toHaveLength(1);
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html.match(/name="keywords"/g)).toHaveLength(1);
    expect(html).toContain('<meta name="keywords" content="kurti, indore" />');
  });

  it('keys routes without "/" so they are valid database keys', () => {
    expect(pageMetaKey('/')).toBe('_home');
    expect(pageMetaKey('/return-exchange-policy')).toBe('return-exchange-policy');
  });
});
