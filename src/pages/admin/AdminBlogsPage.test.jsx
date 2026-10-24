import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../services/blog.js', () => ({
  BlogError: class extends Error {},
  deletePost: vi.fn(), duplicate: vi.fn(), publishPost: vi.fn(), unpublishPost: vi.fn(),
  subscribeToAdminPosts: (cb) => { cb([]); return () => {}; },
  subscribeToCategories: (cb) => { cb([]); return () => {}; },
}));
const { default: AdminBlogsPage } = await import('./AdminBlogsPage.jsx');

describe('AdminBlogsPage (work in progress)', () => {
  it('says at the top that the feature is under construction and must not be used', () => {
    render(<MemoryRouter><AdminBlogsPage /></MemoryRouter>);
    expect(screen.getByRole('note').textContent).toMatch(/Under construction.*Please don't use this feature yet/);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Under construction/);
  });

  it('cannot start a new article while the editor is unfinished', () => {
    render(<MemoryRouter><AdminBlogsPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /New article/ })).toBeDisabled();
  });
});
