import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const svc = { createDraft: vi.fn(), getAdminPost: vi.fn(), savePost: vi.fn(), publishPost: vi.fn(), schedulePost: vi.fn(), unpublishPost: vi.fn(), saveCategory: vi.fn() };
class BlogError extends Error { constructor(code, message, details) { super(message); this.code = code; this.details = details; } }
const showToast = vi.fn();

vi.mock('../../context/ToastContext.jsx', () => ({ useToast: () => ({ showToast }) }));
vi.mock('../../services/blog.js', () => ({
  BlogError,
  createDraft: (...a) => svc.createDraft(...a), getAdminPost: (...a) => svc.getAdminPost(...a), savePost: (...a) => svc.savePost(...a),
  publishPost: (...a) => svc.publishPost(...a), schedulePost: (...a) => svc.schedulePost(...a), unpublishPost: (...a) => svc.unpublishPost(...a),
  saveCategory: (...a) => svc.saveCategory(...a), subscribeToCategories: (cb) => { cb([{ id: 'style', name: 'Style' }]); return () => {}; },
}));
vi.mock('../../services/collections.js', () => ({ subscribeToCollections: (cb) => { cb([]); return () => {}; } }));
vi.mock('../../services/blogMedia.js', () => ({ uploadBlogImage: vi.fn() }));
vi.mock('../../components/blog/editor/BlogRichEditor.jsx', () => ({ default: ({ value, onChange }) => <textarea aria-label="Article body" value={value} onChange={(e) => onChange(e.target.value)} /> }));
vi.mock('../../components/blog/editor/BlogProductPicker.jsx', () => ({ default: () => <div>picker</div> }));
vi.mock('../../components/blog/BlogArticle.jsx', () => ({ default: ({ post }) => <div data-testid="preview">{post.title}</div> }));

const { normalizePost } = await import('../../utils/blog/post.js');
const body = (t) => JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }] });
const make = (over = {}) => normalizePost({ id: 'blog_1', type: 'general', title: 'Hello World', slug: 'hello-world', body: body('Some words.'), status: 'draft', createdAt: 1, updatedAt: 1, ...over });

const view = (url) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes>
      <Route path="/super/blogs/:id" element={<AdminBlogEditorPage />} />
      <Route path="/super/blogs" element={<div>LIST</div>} />
    </Routes>
  </MemoryRouter>
);
const { default: AdminBlogEditorPage } = await import('./AdminBlogEditorPage.jsx');

beforeEach(() => {
  Object.values(svc).forEach((f) => f.mockReset());
  showToast.mockReset();
  svc.createDraft.mockImplementation((type) => make({ id: 'blog_new', type, title: '', slug: '', body: '' }));
  svc.getAdminPost.mockResolvedValue(make());
  svc.savePost.mockImplementation(async (p) => normalizePost({ ...p, slug: p.slug || 'generated', updatedAt: 5 }));
  svc.publishPost.mockResolvedValue();
  svc.schedulePost.mockResolvedValue();
  svc.unpublishPost.mockResolvedValue();
});

describe('new article', () => {
  it('asks for a format first, then opens the editor with that format\'s starter layout', async () => {
    view('/super/blogs/new');
    expect(screen.getByRole('heading', { name: 'New article' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Single Product Spotlight/ }));
    expect(await screen.findByLabelText('Title')).toBeInTheDocument();
    expect(svc.createDraft).toHaveBeenCalledWith('spotlight');
    expect(screen.getByLabelText('Article body').value).toContain('Why we love it');
  });

  it('builds the web address from the title until it is edited by hand', async () => {
    view('/super/blogs/new?type=general');
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Café Style Guide!' } });
    expect(screen.getByLabelText('URL slug')).toHaveValue('cafe-style-guide');
    fireEvent.change(screen.getByLabelText('URL slug'), { target: { value: 'my-own' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Another title' } });
    expect(screen.getByLabelText('URL slug')).toHaveValue('my-own');
  });

  it('saves the draft with the typed tags and moves to its own address', async () => {
    view('/super/blogs/new?type=general');
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'My post' } });
    fireEvent.change(screen.getByLabelText('Tags (comma separated)'), { target: { value: 'Winter, kurti, winter' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(svc.savePost).toHaveBeenCalled());
    expect(svc.savePost.mock.calls[0][0].tags).toEqual(['winter', 'kurti']);
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Saved.'));
  });
});

describe('existing article', () => {
  it('loads it, and shows a message when it no longer exists', async () => {
    view('/super/blogs/blog_1');
    expect(await screen.findByLabelText('Title')).toHaveValue('Hello World');
    svc.getAdminPost.mockResolvedValue(null);
    view('/super/blogs/gone');
    expect(await screen.findByText(/no longer exists/)).toBeInTheDocument();
  });

  it('tells the author about unsaved changes and blocks publishing an empty article', async () => {
    svc.getAdminPost.mockResolvedValue(make({ body: '' }));
    view('/super/blogs/blog_1');
    await screen.findByLabelText('Title');
    expect(screen.queryByText('Unsaved changes')).toBeNull();
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Edited' } });
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.getByText('The article is empty.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish now' })).toBeDisabled();
  });

  it('saves then publishes', async () => {
    view('/super/blogs/blog_1');
    await screen.findByLabelText('Title');
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));
    await waitFor(() => expect(svc.publishPost).toHaveBeenCalledWith('blog_1'));
    expect(svc.savePost).toHaveBeenCalled();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/Published/)));
  });

  it('needs a date before scheduling, then schedules for that time', async () => {
    view('/super/blogs/blog_1');
    await screen.findByLabelText('Title');
    expect(screen.getByRole('button', { name: 'Schedule' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Publish automatically at'), { target: { value: '2030-01-02T09:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }));
    await waitFor(() => expect(svc.schedulePost).toHaveBeenCalledWith('blog_1', new Date('2030-01-02T09:30').getTime()));
  });

  it('unpublishes a live article back to draft, and archives', async () => {
    svc.getAdminPost.mockResolvedValue(make({ status: 'published', publishedAt: 3 }));
    view('/super/blogs/blog_1');
    await screen.findByLabelText('Title');
    expect(screen.getByRole('button', { name: 'Save & update live' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
    await waitFor(() => expect(svc.unpublishPost).toHaveBeenCalledWith('blog_1', 'draft'));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(svc.unpublishPost).toHaveBeenCalledWith('blog_1', 'archived'));
  });

  it('shows what went wrong when the service refuses', async () => {
    svc.publishPost.mockRejectedValue(new BlogError('not_publishable', 'Spotlight needs exactly 1 product.', [{ message: 'Spotlight needs exactly 1 product.' }]));
    view('/super/blogs/blog_1');
    await screen.findByLabelText('Title');
    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Spotlight needs exactly 1 product.');
  });

  it('previews the article at phone, tablet and desktop widths', async () => {
    view('/super/blogs/blog_1?preview=1');
    await screen.findByLabelText('Title');
    expect(screen.getByTestId('preview')).toHaveTextContent('Hello World');
    fireEvent.click(screen.getByRole('button', { name: /Phone/ }));
    expect(screen.getByTestId('preview').parentElement.style.maxWidth).toBe('390px');
    fireEvent.click(screen.getByRole('button', { name: /Tablet/ }));
    expect(screen.getByTestId('preview').parentElement.style.maxWidth).toBe('768px');
  });
});
