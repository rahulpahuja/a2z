import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let settings = {};
vi.mock('../services/storeSettings.js', () => ({
  subscribeToStoreSettings: (cb) => {
    cb(settings, null);
    return () => {};
  },
}));

import { SiteFooterNote, ProductFooterNote } from './FooterNote.jsx';

const renderAt = (path, ui) => render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

describe('SiteFooterNote', () => {
  beforeEach(() => {
    settings = {};
  });

  it('renders nothing when the text is empty, whitespace or not a string', () => {
    for (const value of [undefined, '', '   ', 7]) {
      settings = { siteFooterText: value };
      const { container, unmount } = renderAt('/', <SiteFooterNote />);
      expect(container.firstChild).toBeNull();
      unmount();
    }
  });

  it('renders the text on customer pages, including ones without SiteFooter', () => {
    settings = { siteFooterText: 'Free shipping over ₹999' };
    renderAt('/checkout/payment', <SiteFooterNote />);
    expect(screen.getByRole('note').textContent).toBe('Free shipping over ₹999');
  });

  it('shows markup literally instead of rendering it', () => {
    settings = { siteFooterText: '<img src=x onerror=alert(1)>' };
    const { container } = renderAt('/', <SiteFooterNote />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('note').textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('is hidden on super-user pages', () => {
    settings = { siteFooterText: 'Hello' };
    const { container } = renderAt('/super/settings', <SiteFooterNote />);
    expect(container.firstChild).toBeNull();
  });
});

describe('ProductFooterNote', () => {
  it('renders only its own field, independent of the site-wide text', () => {
    settings = { siteFooterText: 'site', productFooterText: 'product' };
    renderAt('/products/abc', <ProductFooterNote />);
    expect(screen.getByRole('note').textContent).toBe('product');
  });

  it('renders nothing when only the site-wide text is set', () => {
    settings = { siteFooterText: 'site' };
    const { container } = renderAt('/products/abc', <ProductFooterNote />);
    expect(container.firstChild).toBeNull();
  });
});
