import { describe, it, expect } from 'vitest';
import { cleanLabel, describeClick, MAX_LABEL_LENGTH, REDACTED } from './clickTracking.js';

const ORIGIN = 'https://www.thea2zcollection.com';
const where = (pathname = '/') => ({ pathname, origin: ORIGIN });

// Builds a page from HTML and returns the element matching `selector`.
function pick(html, selector) {
  document.body.innerHTML = html;
  return document.querySelector(selector);
}

describe('cleanLabel', () => {
  it('collapses whitespace and shortens long text', () => {
    expect(cleanLabel('  New \n  Arrivals ')).toBe('New Arrivals');
    expect(cleanLabel('x'.repeat(200))).toHaveLength(MAX_LABEL_LENGTH);
    expect(cleanLabel(null)).toBe('');
  });

  it('redacts anything that looks like a phone number, email address or long id', () => {
    expect(cleanLabel('Call 9876543210')).toBe(REDACTED);
    expect(cleanLabel('me@example.com')).toBe(REDACTED);
    expect(cleanLabel('Order 12 of 34')).toBe('Order 12 of 34');
  });
});

describe('describeClick', () => {
  it('describes a header link with its label, area and internal destination', () => {
    const link = pick('<header><nav><a id="t" href="/products?filter=new-arrivals">New Arrivals</a></nav></header>', '#t');
    expect(describeClick(link, where('/'))).toEqual({
      element: 'link', label: 'New Arrivals', area: 'header', page_path: '/', destination: '/products?filter=new-arrivals',
    });
  });

  it('uses the nearest option when the click lands on something inside it, and ignores the icon name', () => {
    const inner = pick('<main><button><span class="material-symbols-outlined">arrow_back</span><b id="t">Back</b></button></main>', '#t');
    expect(describeClick(inner, where('/products'))).toMatchObject({ element: 'button', label: 'Back', area: 'main' });
  });

  it('prefers data-analytics-label, then aria-label, over the visible text', () => {
    const labelled = pick('<footer><a id="t" href="/faqs" aria-label="Open FAQs" data-analytics-label="FAQ link">?</a></footer>', '#t');
    expect(describeClick(labelled, where('/'))).toMatchObject({ label: 'FAQ link', area: 'footer' });
    const aria = pick('<button id="t" aria-label="Open menu"><svg></svg></button>', '#t');
    expect(describeClick(aria, where('/'))).toMatchObject({ label: 'Open menu', area: 'page' });
  });

  it('reports only the host of an external link and only the scheme of mailto and tel links', () => {
    const external = pick('<footer><a id="t" href="https://www.instagram.com/a2z?x=1">Instagram</a></footer>', '#t');
    expect(describeClick(external, where('/')).destination).toBe('www.instagram.com');
    const mail = pick('<a id="t" href="mailto:owner@example.com">Email us</a>', '#t');
    expect(describeClick(mail, where('/')).destination).toBe('mailto');
    const phone = pick('<a id="t" href="tel:+919876543210">Call</a>', '#t');
    expect(describeClick(phone, where('/')).destination).toBe('tel');
  });

  it('labels a menu inside a dialog as the menu, and an unlabelled option as unlabelled', () => {
    const inDrawer = pick('<div role="dialog"><a id="t" href="/about-us">About Us</a></div>', '#t');
    expect(describeClick(inDrawer, where('/'))).toMatchObject({ area: 'menu' });
    const bare = pick('<button id="t"></button>', '#t');
    expect(describeClick(bare, where('/')).label).toBe('unlabelled');
  });

  it('returns nothing for text that is not an option, an opted-out area, or the bot-trap link', () => {
    expect(describeClick(pick('<p id="t">Just text</p>', '#t'), where('/'))).toBeNull();
    expect(describeClick(pick('<div data-analytics-ignore><button id="t">Save</button></div>', '#t'), where('/'))).toBeNull();
    expect(describeClick(pick('<a id="t" href="/__trap__" data-analytics-ignore>do not follow</a>', '#t'), where('/'))).toBeNull();
  });

  it('reports nothing from the admin or the pages with personal details', () => {
    const button = pick('<button id="t">Place order</button>', '#t');
    for (const path of ['/super/products', '/dashboard', '/checkout/shipping', '/checkout/payment', '/profile', '/orders', '/orders/tracking']) {
      expect(describeClick(button, where(path))).toBeNull();
    }
    expect(describeClick(button, where('/cart'))).not.toBeNull();
  });
});
