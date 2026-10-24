import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const rows = [{ id: 'b1', title: 'Winter Guide', slug: 'winter-guide', type: 'guide', status: 'published', productIds: ['p1'], tags: [], author: '', categoryId: '', publishedAt: 5, updatedAt: 9 }];
vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../services/blog.js', () => ({
  BlogError: class extends Error {},
  deletePost: vi.fn(), duplicate: vi.fn(), publishPost: vi.fn(), unpublishPost: vi.fn(),
  subscribeToAdminPosts: (cb) => { cb(rows); return () => {}; },
  subscribeToCategories: (cb) => { cb([]); return () => {}; },
}));
const { default: AdminBlogsPage } = await import('./AdminBlogsPage.jsx');

describe('AdminBlogsPage', () => {
  it('no longer carries an under-construction warning, and New article opens the editor', () => {
    render(<MemoryRouter><AdminBlogsPage /></MemoryRouter>);
    expect(screen.queryByRole('note')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Blog');
    expect(screen.getByRole('link', { name: /New article/ })).toHaveAttribute('href', '/super/blogs/new');
  });

  it('lists articles with their status, type and product count', () => {
    render(<MemoryRouter><AdminBlogsPage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Winter Guide' })).toHaveAttribute('href', '/super/blogs/b1');
    const row = screen.getByRole('row', { name: /Winter Guide/ });
    expect(within(row).getByText('Published')).toBeInTheDocument();
    expect(within(row).getByText('Buying Guide')).toBeInTheDocument();
  });
});
