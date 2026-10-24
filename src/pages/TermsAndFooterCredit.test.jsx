import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/storeSettings.js', () => ({
  DEFAULT_STORE_SETTINGS: { facebookUrl: '' },
  subscribeToStoreSettings: (cb) => {
    cb({});
    return () => {};
  },
}));
vi.mock('../components/BrandName.jsx', () => ({ default: () => <span>brand</span> }));

const { default: SiteFooter } = await import('../components/SiteFooter.jsx');
const { default: TermsConditionsPage } = await import('./TermsConditionsPage.jsx');

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('footer credit', () => {
  it('says "Powered by mobile1x.com" and links to https://mobile1x.com safely', () => {
    wrap(<SiteFooter />);
    const link = screen.getByRole('link', { name: 'mobile1x.com' });
    expect(link).toHaveAttribute('href', 'https://mobile1x.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.parentElement.textContent).toMatch(/^Powered by mobile1x\.com/);
  });
});

describe('Terms and Conditions', () => {
  it('states that mobile1x.com is only the developer and is not liable for the business', () => {
    wrap(<TermsConditionsPage />);
    expect(screen.getByRole('heading', { name: 'Website Developer' })).toBeInTheDocument();
    const section = screen.getByRole('heading', { name: 'Website Developer' }).parentElement;
    expect(section.textContent).toMatch(/only as the developer/);
    expect(section.textContent).toMatch(/not the seller, manufacturer/);
    expect(section.textContent).toMatch(/not liable/);
    expect(section.querySelector('a')).toHaveAttribute('href', 'https://mobile1x.com');
  });
});
