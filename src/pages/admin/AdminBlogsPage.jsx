import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext.jsx';
import { BlogError, deletePost, duplicate, publishPost, subscribeToAdminPosts, subscribeToCategories, unpublishPost } from '../../services/blog.js';
import { STATUSES, STATUS_LABELS, canTransition } from '../../utils/blog/status.js';
import { BLOG_TYPES, getBlogType } from '../../utils/blog/types.js';
import './AdminBlog.css';

const fmt = (ms) => (Number.isFinite(ms) && ms > 0 ? new Date(ms).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const DAY = 24 * 60 * 60 * 1000;
const DATE_RANGES = [
  { id: '', label: 'Any date' },
  { id: '7', label: 'Published in the last 7 days' },
  { id: '30', label: 'Published in the last 30 days' },
  { id: '365', label: 'Published in the last year' },
];

export default function AdminBlogsPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [posts, setPosts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [range, setRange] = useState('');
  const [busyId, setBusyId] = useState('');

  useEffect(() => subscribeToAdminPosts(setPosts, () => { setFailed(true); setPosts([]); }), []);
  useEffect(() => subscribeToCategories(setCategories), []);

  const rows = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const since = range ? Date.now() - Number(range) * DAY : 0;
    return (posts ?? []).filter((p) => {
      if (status && p.status !== status) return false;
      if (type && p.type !== type) return false;
      if (categoryId && p.categoryId !== categoryId) return false;
      if (since && !(p.publishedAt >= since)) return false;
      const hay = `${p.title} ${p.slug} ${p.author} ${p.tags.join(' ')}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [posts, query, status, type, categoryId, range]);

  const run = async (post, fn, done) => {
    setBusyId(post.id);
    try {
      await fn();
      showToast(done);
    } catch (err) {
      showToast(err instanceof BlogError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusyId('');
    }
  };

  const remove = (post) => {
    if (!window.confirm(`Delete "${post.title || 'Untitled'}" permanently${post.status === 'published' ? ' and take it off the site' : ''}? This cannot be undone.`)) return;
    run(post, () => deletePost(post.id), 'Article deleted.');
  };

  const categoryName = (id) => categories.find((c) => c.id === id)?.name ?? '—';

  return (
    <div className="admin-page-container">
      <header className="admin-header ab-head">
        <div>
          <h1 className="admin-page-title">Blog</h1>
          <p className="admin-page-subtitle">Write, schedule and publish articles that link to your products and collections.</p>
        </div>
        <Link to="/super/blogs/new" className="btn btn-primary">
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
          New article
        </Link>
      </header>

      <main className="admin-main-container">
        <section className="admin-card ab-list">
          <div className="ab-filters">
            <input type="search" aria-label="Search articles" placeholder="Search title, slug, author or tag" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              {BLOG_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <select aria-label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select aria-label="Publication date" value={range} onChange={(e) => setRange(e.target.value)}>
              {DATE_RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>

          {posts === null ? <p className="ab-empty" role="status">Loading…</p>
            : failed ? <p className="ab-empty" role="alert">Could not load articles. Check your sign-in and try again.</p>
            : rows.length === 0 ? <p className="ab-empty">{posts.length === 0 ? 'No articles yet. Create the first one.' : 'No articles match these filters.'}</p>
            : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr><th>Article</th><th>Type</th><th>Products</th><th>Category</th><th>Status</th><th>Updated</th><th>Published</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="ab-title">
                            {p.coverImage ? <img src={p.coverImage} alt="" className="ab-thumb" loading="lazy" /> : <span className="ab-thumb ab-thumb--empty material-symbols-outlined" aria-hidden="true">article</span>}
                            <div>
                              <Link to={`/super/blogs/${p.id}`}><strong>{p.title || 'Untitled'}</strong></Link>
                              <small>/blogs/{p.slug || '…'}</small>
                            </div>
                          </div>
                        </td>
                        <td>{getBlogType(p.type).label}</td>
                        <td>{p.productIds.length}</td>
                        <td>{categoryName(p.categoryId)}</td>
                        <td><span className={`ab-status ab-status--${p.status}`}>{STATUS_LABELS[p.status]}</span>{p.status === 'scheduled' && <small>{fmt(p.publishAt)}</small>}</td>
                        <td>{fmt(p.updatedAt)}</td>
                        <td>{fmt(p.publishedAt)}</td>
                        <td>
                          <div className="ab-actions">
                            <button type="button" onClick={() => navigate(`/super/blogs/${p.id}`)}>Edit</button>
                            <button type="button" onClick={() => navigate(`/super/blogs/${p.id}?preview=1`)}>Preview</button>
                            {p.status === 'published' && <a href={`/blogs/${p.slug}`} target="_blank" rel="noreferrer">View</a>}
                            <button type="button" disabled={busyId === p.id} onClick={() => run(p, async () => { const copy = await duplicate(p.id); navigate(`/super/blogs/${copy.id}`); }, 'Duplicated as a new draft.')}>Duplicate</button>
                            {canTransition(p.status, 'published') && p.status !== 'published' && <button type="button" disabled={busyId === p.id} onClick={() => run(p, () => publishPost(p.id), 'Published.')}>Publish</button>}
                            {p.status === 'published' && <button type="button" disabled={busyId === p.id} onClick={() => run(p, () => unpublishPost(p.id, 'draft'), 'Unpublished. It is a draft again.')}>Unpublish</button>}
                            {p.status !== 'archived' && <button type="button" disabled={busyId === p.id} onClick={() => run(p, () => unpublishPost(p.id, 'archived'), 'Archived.')}>Archive</button>}
                            <button type="button" className="ab-danger" disabled={busyId === p.id} onClick={() => remove(p)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </section>
      </main>
    </div>
  );
}
