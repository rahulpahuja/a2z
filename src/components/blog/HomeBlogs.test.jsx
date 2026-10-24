import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let entries;
vi.mock('../../services/blog.js', () => ({
  subscribeToBlogIndex: (cb) => { cb(entries); return () => {}; },
  subscribeToCategories: (cb) => { cb([{ id: 'styling', name: 'Styling guide' }]); return () => {}; },
}));
vi.mock('../../services/analytics.js', () => ({ logBlogCardClick: vi.fn() }));

const { default: HomeBlogs } = await import('./HomeBlogs.jsx');

const entry = (n) => ({ id: `b${n}`, slug: `post-${n}`, title: `Post ${n}`, type: 'general', categoryId: 'styling', excerpt: '', readingMinutes: 3, publishedAt: 1000 - n, productCount: 0 });
const renderBlogs = () => render(<MemoryRouter><HomeBlogs /></MemoryRouter>);

beforeEach(() => {
  entries = [];
});

describe('HomeBlogs', () => {
  it('renders nothing while no article is published', () => {
    const { container } = renderBlogs();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the three latest articles linking to their pages, plus a link to all of them', () => {
    entries = [1, 2, 3, 4].map(entry);
    renderBlogs();
    expect(screen.getByRole('heading', { name: 'From the Journal' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByRole('link', { name: /Post 1/ })).toHaveAttribute('href', '/blogs/post-1');
    expect(screen.queryByText('Post 4')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View All/ })).toHaveAttribute('href', '/blogs');
    expect(screen.getAllByText('Styling guide')).toHaveLength(3);
  });
});
