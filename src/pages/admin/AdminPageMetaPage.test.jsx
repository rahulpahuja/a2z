import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let overrides;
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../services/pageMeta.js', () => ({
  subscribeToPageMeta: (cb) => {
    cb(overrides);
    return () => {};
  },
  savePageMeta: vi.fn().mockResolvedValue(undefined),
}));

const { default: AdminPageMetaPage } = await import('./AdminPageMetaPage.jsx');

const renderAt = (url = '/super/page-meta') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <AdminPageMetaPage />
    </MemoryRouter>
  );

beforeEach(() => {
  overrides = {};
});

describe('AdminPageMetaPage', () => {
  it('shows a page dropdown and one page editor at a time instead of a list', () => {
    renderAt();
    const select = screen.getByLabelText('Page');
    expect(select.tagName).toBe('SELECT');
    expect(select.options.length).toBeGreaterThan(5);
    expect(document.querySelectorAll('input[id^="title-"]')).toHaveLength(1);
  });

  it('switches the editor when another page is chosen', () => {
    renderAt();
    fireEvent.change(screen.getByLabelText('Page'), { target: { value: '/products' } });
    expect(document.getElementById('title-/products')).toBeInTheDocument();
    expect(document.getElementById('title-/')).toBeNull();
  });

  it('opens the page named in ?page= and falls back to the first page for an unknown one', () => {
    renderAt('/super/page-meta?page=/faqs');
    expect(document.getElementById('title-/faqs')).toBeInTheDocument();
  });

  it('falls back to the first page for an unknown ?page=', () => {
    renderAt('/super/page-meta?page=/nope');
    expect(document.getElementById('title-/')).toBeInTheDocument();
  });

  it('marks customised pages in the dropdown', () => {
    overrides = { products: { title: 'Custom shop title', description: '', metaTags: [] } };
    renderAt();
    const options = [...screen.getByLabelText('Page').options].map((o) => o.textContent);
    expect(options.find((t) => t.includes('/products'))).toContain('customised');
    expect(screen.getByText(/^1 of \d+ pages customised\.$/)).toBeInTheDocument();
  });

  it('shows live SEO checks, a search preview and the tips list', () => {
    renderAt();
    expect(screen.getByLabelText('SEO checks for this page')).toBeInTheDocument();
    expect(screen.getByLabelText('Search result preview')).toBeInTheDocument();
    expect(screen.getByText('Tips to improve your SEO')).toBeInTheDocument();
  });

  it('flags a title that another page already uses', () => {
    overrides = { products: { title: 'A2Z Collection | Fashion from Indore', description: '', metaTags: [] } };
    renderAt('/super/page-meta?page=/');
    expect(screen.getByText(/Another page already uses this exact title \(\/products\)/)).toBeInTheDocument();
  });

  it('warns before discarding unsaved edits when switching pages', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderAt();
    fireEvent.change(document.getElementById('title-/'), { target: { value: 'Edited title' } });
    fireEvent.change(screen.getByLabelText('Page'), { target: { value: '/products' } });
    expect(confirm).toHaveBeenCalled();
    expect(document.getElementById('title-/')).toHaveValue('Edited title');
    confirm.mockReturnValue(true);
    fireEvent.change(screen.getByLabelText('Page'), { target: { value: '/products' } });
    expect(document.getElementById('title-/products')).toBeInTheDocument();
    confirm.mockRestore();
  });
});
