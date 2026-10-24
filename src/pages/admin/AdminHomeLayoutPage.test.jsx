import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const showToast = vi.fn();
const saveHomeLayout = vi.fn();
let emitted;

vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => ({ showToast }) }));
vi.mock('../../components/ProductImage.jsx', () => ({ default: ({ alt }) => <img alt={alt} /> }));
vi.mock('../../context/CartContext.jsx', () => ({ formatCurrency: (n) => `₹${n}` }));
vi.mock('../../services/storeSettings.js', () => ({
  DEFAULT_STORE_SETTINGS: { homeProductsPerRow: 2, showCategoryBubbles: false },
  subscribeToStoreSettings: (cb) => {
    cb({ homeProductsPerRow: 2, showCategoryBubbles: false });
    return () => {};
  },
}));

const catalog = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: `Product ${id}`, price: 100, category: 'Tops', image: `${id}.jpg` }));
vi.mock('../../context/ProductsContext.jsx', () => ({ useProducts: () => ({ products: catalog, loading: false }) }));

vi.mock('../../services/homeLayout.js', async () => {
  const utils = await import('../../utils/homeLayout.js');
  class HomeLayoutConflictError extends Error {}
  return {
    HomeLayoutConflictError,
    getCachedHomeLayout: () => utils.createDefaultHomeLayout(),
    subscribeToHomeLayout: (cb) => {
      cb(emitted, null, { cached: false });
      return () => {};
    },
    saveHomeLayout: (...args) => saveHomeLayout(...args),
  };
});

const { createDefaultHomeLayout } = await import('../../utils/homeLayout.js');
const { default: AdminHomeLayoutPage } = await import('./AdminHomeLayoutPage.jsx');

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminHomeLayoutPage />
    </MemoryRouter>
  );

const productNames = () => document.querySelectorAll('.hl-products .hl-product__name');

beforeEach(() => {
  showToast.mockReset();
  saveHomeLayout.mockReset();
  emitted = { ...createDefaultHomeLayout(), rev: 3 };
});

describe('AdminHomeLayoutPage', () => {
  it('starts with Save disabled and enables it after an edit', () => {
    renderPage();
    const save = screen.getByRole('button', { name: 'Saved' });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Move Hero banner down' }));
    expect(screen.getByRole('button', { name: 'Save layout' })).toBeEnabled();
  });

  it('reorders sections with the arrow buttons', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Move Hero banner down' }));
    const titles = [...document.querySelectorAll('.hl-section__title')].map((n) => n.textContent);
    expect(titles.slice(0, 2)).toEqual(['Shop by gender', 'Hero banner']);
    expect(screen.getByRole('button', { name: 'Move Shop by gender up' })).toBeDisabled();
  });

  it('will not hide the last visible section', () => {
    emitted = {
      ...createDefaultHomeLayout(),
      rev: 1,
      sections: createDefaultHomeLayout().sections.map((s) => ({ ...s, visible: s.id === 'hero' })),
    };
    renderPage();
    expect(screen.getByRole('switch', { name: 'Show Hero banner on the home screen' })).toBeDisabled();
  });

  it('pins a product to the top and shows it first', () => {
    renderPage();
    expect([...productNames()].map((n) => n.textContent).slice(0, 2)).toEqual(['Product a', 'Product b']);
    const row = [...productNames()].find((n) => n.textContent === 'Product d').closest('li');
    fireEvent.click(within(row).getByRole('button', { name: 'Pin top' }));
    expect([...productNames()].map((n) => n.textContent)[0]).toBe('Product d');
    expect(screen.getByText('1 pinned to top · 0 pinned to bottom · 0 hidden · up to 200 per list.')).toBeInTheDocument();
  });

  it('moves a hidden product out of the feed and lists it under "Hidden"', () => {
    renderPage();
    const row = [...productNames()].find((n) => n.textContent === 'Product b').closest('li');
    fireEvent.click(within(row).getByRole('button', { name: 'Hide' }));
    expect([...document.querySelectorAll('.hl-products')][0].textContent).not.toContain('Product b ');
    expect(screen.getByText('Hidden from the home feed (1)')).toBeInTheDocument();
  });

  it('marks where the first featured row ends', () => {
    renderPage();
    expect(screen.getByText(/End of Featured Elegance \(first 2 products\)/)).toBeInTheDocument();
  });

  it('saves against the revision it loaded', async () => {
    saveHomeLayout.mockResolvedValue({ ...emitted, rev: 4 });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Move Hero banner down' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));
    await waitFor(() => expect(saveHomeLayout).toHaveBeenCalledTimes(1));
    expect(saveHomeLayout.mock.calls[0][1]).toBe(3);
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringContaining('saved')));
  });

  it('shows a conflict banner offering to reload or overwrite when the save is rejected', async () => {
    const { HomeLayoutConflictError } = await import('../../services/homeLayout.js');
    saveHomeLayout.mockRejectedValue(new HomeLayoutConflictError());
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Move Hero banner down' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));
    expect(await screen.findByText(/Another super user saved a different layout/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load latest (discard my edits)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overwrite with my edits' })).toBeInTheDocument();
  });

  it('keeps size inputs free-form: typing commits on blur, clamped to the limits', () => {
    renderPage();
    const trending = [...document.querySelectorAll('.hl-section__title')].find((n) => n.textContent === 'Trending Now').closest('li');
    fireEvent.click(within(trending).getByText('Size & spacing'));
    const input = within(trending).getByLabelText('Product card width (px)');
    fireEvent.change(input, { target: { value: '9999' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(480);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(null);
  });
});
