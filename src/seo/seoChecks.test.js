import { describe, it, expect } from 'vitest';
import { analyzeSeo, SEO_TIPS, TITLE_RANGE } from './seoChecks.js';

const byId = (checks, id) => checks.find((c) => c.id === id);
const good = {
  effectiveTitle: 'Co-ord Sets for Women | A2Z Collection',
  effectiveDescription: 'Shop co-ord sets for women online with delivery across India, shipped from our studio in Indore.',
  brand: 'A2Z Collection',
};

describe('analyzeSeo', () => {
  it('passes a well-formed title and description', () => {
    const checks = analyzeSeo(good);
    expect(byId(checks, 'title-length').level).toBe('good');
    expect(byId(checks, 'description-length').level).toBe('good');
    expect(byId(checks, 'brand')).toBeUndefined();
    expect(byId(checks, 'title-unique').level).toBe('good');
  });

  it('flags empty, short and long text', () => {
    expect(byId(analyzeSeo({ ...good, effectiveTitle: '' }), 'title-length').level).toBe('bad');
    expect(byId(analyzeSeo({ ...good, effectiveTitle: 'Shop' }), 'title-length').level).toBe('warn');
    expect(byId(analyzeSeo({ ...good, effectiveTitle: 'x'.repeat(TITLE_RANGE.max + 1) }), 'title-length').level).toBe('warn');
    expect(byId(analyzeSeo({ ...good, effectiveDescription: 'x'.repeat(400) }), 'description-length').level).toBe('warn');
  });

  it('flags a missing brand, case-insensitively', () => {
    expect(byId(analyzeSeo({ ...good, effectiveTitle: 'Co-ord Sets for Women Online Store' }), 'brand').level).toBe('warn');
    expect(byId(analyzeSeo({ ...good, effectiveTitle: 'Co-ord Sets for Women | a2z collection' }), 'brand')).toBeUndefined();
  });

  it('flags a duplicate title as bad and a duplicate description as a warning', () => {
    const others = [{ path: '/products', title: ' co-ord sets for women | a2z collection ', description: good.effectiveDescription }];
    const checks = analyzeSeo({ ...good, others });
    expect(byId(checks, 'title-unique')).toMatchObject({ level: 'bad' });
    expect(byId(checks, 'title-unique').message).toContain('/products');
    expect(byId(checks, 'description-unique').level).toBe('warn');
  });

  it('notices all-caps, trailing separators and a custom og:image', () => {
    expect(byId(analyzeSeo({ ...good, effectiveTitle: 'BUY THE BEST CLOTHES ONLINE | A2Z COLLECTION' }), 'title-caps')).toBeTruthy();
    expect(byId(analyzeSeo({ ...good, effectiveTitle: 'Co-ord Sets for Women | A2Z Collection |' }), 'title-format')).toBeTruthy();
    const withImage = analyzeSeo({ ...good, metaTags: [{ attr: 'property', key: 'og:image', content: 'https://x/y.jpg' }] });
    expect(byId(withImage, 'og-image').level).toBe('good');
    expect(byId(analyzeSeo(good), 'og-image').level).toBe('info');
    expect(byId(analyzeSeo({ ...good, metaTags: [{ attr: 'property', key: 'og:image', content: '  ' }] }), 'og-image').level).toBe('info');
  });

  it('warns about noindex and explains pages that are not indexed by default', () => {
    const noindex = analyzeSeo({ ...good, metaTags: [{ attr: 'name', key: 'Robots', content: 'noindex, nofollow' }] });
    expect(byId(noindex, 'robots').level).toBe('warn');
    expect(byId(analyzeSeo({ ...good, noindexByDefault: true }), 'robots').level).toBe('info');
    expect(byId(analyzeSeo(good), 'robots')).toBeUndefined();
  });

  it('does not throw on missing input', () => {
    expect(() => analyzeSeo({})).not.toThrow();
  });
});

describe('SEO_TIPS', () => {
  it('each tip has an icon, title and body, and titles are unique', () => {
    SEO_TIPS.forEach((tip) => {
      expect(tip.icon && tip.title && tip.body).toBeTruthy();
    });
    expect(new Set(SEO_TIPS.map((t) => t.title)).size).toBe(SEO_TIPS.length);
  });
});
