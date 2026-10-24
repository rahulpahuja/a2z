import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext.jsx';
import BlogRichEditor from '../../components/blog/editor/BlogRichEditor.jsx';
import BlogProductPicker from '../../components/blog/editor/BlogProductPicker.jsx';
import BlogArticle from '../../components/blog/BlogArticle.jsx';
import { BlogError, createDraft, getAdminPost, publishPost, saveCategory, savePost, schedulePost, subscribeToCategories, unpublishPost } from '../../services/blog.js';
import { subscribeToCollections } from '../../services/collections.js';
import { uploadBlogImage } from '../../services/blogMedia.js';
import { isDocEmpty, serializeDoc } from '../../utils/blog/doc.js';
import { fromLocalInput, toLocalInput } from '../../utils/blog/datetime.js';
import { normalizePost, normalizeTags, POST_LIMITS, SEO_RANGES, validatePost } from '../../utils/blog/post.js';
import { slugify } from '../../utils/blog/slug.js';
import { STATUS_LABELS, canTransition } from '../../utils/blog/status.js';
import { BLOG_TYPES, buildStarterDoc, getBlogType, isBlogType } from '../../utils/blog/types.js';
import './AdminBlog.css';

const PREVIEW_WIDTHS = [{ label: 'Phone', px: 390, icon: 'smartphone' }, { label: 'Tablet', px: 768, icon: 'tablet' }, { label: 'Desktop', px: 1100, icon: 'computer' }];
const count = (text, range) => `${text.length} characters (aim for ${range.min}–${range.max})`;

function Panel({ title, icon, children, open = false }) {
  return (
    <details className="ab-panel" open={open}>
      <summary><span className="material-symbols-outlined" aria-hidden="true">{icon}</span>{title}</summary>
      <div className="ab-panel__body">{children}</div>
    </details>
  );
}

export default function AdminBlogEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { showToast } = useToast();
  const isNew = id === 'new';
  const typeParam = params.get('type');

  const [state, setState] = useState('loading'); // loading | choose | ready | missing
  const [post, setPost] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [version, setVersion] = useState(0);
  const [slugAuto, setSlugAuto] = useState(true);
  const [tagsText, setTagsText] = useState('');
  const [scheduleText, setScheduleText] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [previewOpen, setPreviewOpen] = useState(params.get('preview') === '1');
  const [previewWidth, setPreviewWidth] = useState(1100);

  useEffect(() => subscribeToCategories(setCategories), []);
  useEffect(() => subscribeToCollections(setCollections), []);

  useEffect(() => {
    let cancelled = false;
    if (isNew) {
      if (!isBlogType(typeParam)) {
        setState('choose');
        return undefined;
      }
      const draft = createDraft(typeParam);
      setPost({ ...draft, body: serializeDoc(buildStarterDoc(typeParam, {})) });
      setBaseline('');
      setTagsText('');
      setSlugAuto(true);
      setVersion((v) => v + 1);
      setState('ready');
      return undefined;
    }
    setState('loading');
    getAdminPost(id).then((p) => {
      if (cancelled) return;
      if (!p) return setState('missing');
      setPost(p);
      setBaseline(JSON.stringify(p));
      setTagsText(p.tags.join(', '));
      setScheduleText(toLocalInput(p.publishAt));
      setSlugAuto(!p.slug || p.slug === slugify(p.title));
      setVersion((v) => v + 1);
      return setState('ready');
    });
    return () => {
      cancelled = true;
    };
  }, [id, isNew, typeParam]);

  const dirty = state === 'ready' && JSON.stringify(post) !== baseline;
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const check = useMemo(() => (post ? validatePost(post, { forPublish: true }) : { errors: [], warnings: [] }), [post]);
  const patch = (changes) => setPost((p) => ({ ...p, ...changes }));

  const run = async (fn, done) => {
    setBusy(true);
    setProblems([]);
    try {
      const result = await fn();
      if (done) showToast(done);
      return result;
    } catch (err) {
      if (err instanceof BlogError) {
        setProblems(err.details?.length ? err.details.map((d) => d.message) : [err.message]);
        showToast(err.message);
      } else {
        showToast('Something went wrong. Please try again.');
      }
      return null;
    } finally {
      setBusy(false);
    }
  };

  const reload = async (postId) => {
    const fresh = await getAdminPost(postId);
    setPost(fresh);
    setBaseline(JSON.stringify(fresh));
    setScheduleText(toLocalInput(fresh.publishAt));
    return fresh;
  };

  const persist = async () => {
    const saved = await savePost({ ...post, tags: normalizeTags(tagsText.split(',')) });
    setPost(saved);
    setBaseline(JSON.stringify(saved));
    if (isNew) navigate(`/super/blogs/${saved.id}`, { replace: true });
    return saved;
  };

  const transition = (to, done) => run(async () => {
    const saved = await persist();
    await unpublishPost(saved.id, to);
    await reload(saved.id);
  }, done);

  const onTitle = (title) => patch({ title, ...(slugAuto && post.status !== 'published' ? { slug: slugify(title) } : {}) });

  const upload = async (file, field) => {
    if (!file) return;
    try {
      patch({ [field]: await uploadBlogImage(file) });
    } catch (err) {
      showToast(err.message || 'Could not upload that image.');
    }
  };

  const addCategory = async () => {
    const created = await run(() => saveCategory({ name: newCategory }));
    if (created) {
      patch({ categoryId: created.id });
      setNewCategory('');
    }
  };

  if (state === 'loading') return <div className="admin-page-container"><p className="ab-empty" role="status">Loading…</p></div>;
  if (state === 'missing') return <div className="admin-page-container"><p className="ab-empty">That article no longer exists. <Link to="/super/blogs">Back to all articles</Link></p></div>;
  if (state === 'choose') {
    return (
      <div className="admin-page-container">
        <header className="admin-header"><h1 className="admin-page-title">New article</h1><p className="admin-page-subtitle">Choose a format. You can change everything afterwards.</p></header>
        <main className="admin-main-container">
          <div className="ab-types">
            {BLOG_TYPES.map((t) => (
              <button key={t.id} type="button" className="ab-type" onClick={() => setParams({ type: t.id }, { replace: true })}>
                <span className="material-symbols-outlined" aria-hidden="true">{t.icon}</span>
                <strong>{t.label}</strong>
                <small>{t.description}</small>
              </button>
            ))}
          </div>
          <p><Link to="/super/blogs">← Back to all articles</Link></p>
        </main>
      </div>
    );
  }

  const status = post.status;
  const type = getBlogType(post.type);
  const previewPost = { ...normalizePost(post), publishedAt: post.publishedAt || Date.now() };

  return (
    <div className="admin-page-container ab-editor">
      <header className="ab-bar">
        <Link to="/super/blogs" className="ab-bar__back"><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>All articles</Link>
        <span className={`ab-status ab-status--${status}`}>{STATUS_LABELS[status]}</span>
        {dirty && <span className="ab-unsaved" role="status">Unsaved changes</span>}
        <div className="ab-bar__actions">
          <button type="button" className="btn btn-secondary" onClick={() => setPreviewOpen((o) => !o)} aria-pressed={previewOpen}>
            <span className="material-symbols-outlined" aria-hidden="true">visibility</span>Preview
          </button>
          <button type="button" className="btn btn-primary" disabled={busy || !dirty && !isNew} onClick={() => run(persist, status === 'published' ? 'Saved. The live article is updated.' : 'Saved.')}>
            {busy ? 'Saving…' : status === 'published' ? 'Save & update live' : 'Save'}
          </button>
        </div>
      </header>

      {problems.length > 0 && (
        <div className="ab-problems" role="alert">
          <strong>This could not be done:</strong>
          <ul>{problems.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      <div className={`ab-layout${previewOpen ? ' ab-layout--preview' : ''}`}>
        <section className="ab-main" aria-label="Article">
          <label className="ab-field">Title
            <input value={post.title} maxLength={POST_LIMITS.title} onChange={(e) => onTitle(e.target.value)} placeholder="Article title" />
          </label>
          <label className="ab-field">Web address
            <span className="ab-slug">/blogs/<input aria-label="URL slug" value={post.slug} onChange={(e) => { setSlugAuto(false); patch({ slug: e.target.value.toLowerCase() }); }} placeholder="generated-from-the-title" /></span>
            {status === 'published' && <small>Changing this keeps the old link working: it redirects to the new one.</small>}
          </label>
          <label className="ab-field">Short description (excerpt)
            <textarea rows={2} maxLength={POST_LIMITS.excerpt} value={post.excerpt} onChange={(e) => patch({ excerpt: e.target.value })} placeholder="Shown on cards and in search results. Leave empty to use the start of the article." />
          </label>
          <BlogRichEditor value={post.body} version={version} onChange={(body) => patch({ body })} productIds={post.productIds} collectionIds={post.collectionIds} />
        </section>

        <aside className="ab-side" aria-label="Article settings">
          <Panel title="Format" icon="category" open>
            <label className="ab-field">Article type
              <select value={post.type} onChange={(e) => patch({ type: e.target.value })}>
                {BLOG_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <small>{type.description}</small>
            </label>
            <button type="button" className="ab-link" onClick={() => {
              if (!isDocEmpty(post.body) && !window.confirm('Replace the current article with this format\'s starter layout?')) return;
              patch({ body: serializeDoc(buildStarterDoc(post.type, post)) });
              setVersion((v) => v + 1);
            }}>Insert this format's starter layout</button>
            <label className="ab-field">Author
              <input value={post.author} maxLength={POST_LIMITS.author} onChange={(e) => patch({ author: e.target.value })} />
            </label>
            <label className="ab-field">Category
              <select value={post.categoryId} onChange={(e) => patch({ categoryId: e.target.value })}>
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <div className="ab-inline">
              <input aria-label="New category name" placeholder="New category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
              <button type="button" className="ab-link" disabled={!newCategory.trim() || busy} onClick={addCategory}>Add</button>
            </div>
            <label className="ab-field">Tags (comma separated)
              <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="winter, kurti, guide" />
            </label>
            <label className="ab-check"><input type="checkbox" checked={post.featured} onChange={(e) => patch({ featured: e.target.checked })} /> Feature on the blog landing page</label>
          </Panel>

          <Panel title="Products & collections" icon="shopping_bag">
            <BlogProductPicker
              type={post.type}
              collections={collections}
              value={{ productIds: post.productIds, collectionIds: post.collectionIds, heroProductId: post.heroProductId, primaryCollectionId: post.primaryCollectionId }}
              onChange={(next) => patch(next)}
            />
          </Panel>

          <Panel title="Cover image" icon="image">
            {post.coverImage && <img src={post.coverImage} alt="" className="ab-cover" />}
            <label className="ab-field">Upload<input type="file" accept="image/*,.heic,.heif" onChange={(e) => { upload(e.target.files?.[0], 'coverImage'); e.target.value = ''; }} /></label>
            <label className="ab-field">…or image address<input value={post.coverImage} onChange={(e) => patch({ coverImage: e.target.value })} placeholder="https://…" /></label>
            <label className="ab-field">Description of the image (alt text)<input value={post.coverAlt} maxLength={POST_LIMITS.coverAlt} onChange={(e) => patch({ coverAlt: e.target.value })} /></label>
            {post.coverImage && <button type="button" className="ab-link" onClick={() => patch({ coverImage: '', coverAlt: '' })}>Remove cover</button>}
          </Panel>

          <Panel title="Search & sharing (SEO)" icon="travel_explore">
            <label className="ab-field">SEO title<input value={post.seoTitle} maxLength={POST_LIMITS.seoTitle} onChange={(e) => patch({ seoTitle: e.target.value })} placeholder={post.title} /><small>{count(post.seoTitle || post.title, SEO_RANGES.title)}</small></label>
            <label className="ab-field">Meta description<textarea rows={3} maxLength={POST_LIMITS.seoDescription} value={post.seoDescription} onChange={(e) => patch({ seoDescription: e.target.value })} /><small>{count(post.seoDescription || post.excerpt, SEO_RANGES.description)}</small></label>
            <label className="ab-field">Sharing image (Open Graph)<input value={post.ogImage} onChange={(e) => patch({ ogImage: e.target.value })} placeholder="https://… (defaults to the cover)" /></label>
            <input type="file" aria-label="Upload sharing image" accept="image/*,.heic,.heif" onChange={(e) => { upload(e.target.files?.[0], 'ogImage'); e.target.value = ''; }} />
          </Panel>

          <Panel title="Publishing" icon="publish" open>
            {check.errors.length > 0 && <ul className="ab-list-errors" aria-label="Fix before publishing">{check.errors.map((e) => <li key={e.message}>{e.message}</li>)}</ul>}
            {check.warnings.length > 0 && <ul className="ab-list-warn" aria-label="Suggestions">{check.warnings.map((e) => <li key={e.message}>{e.message}</li>)}</ul>}
            {(status === 'draft' || status === 'scheduled' || status === 'archived') && (
              <>
                <button type="button" className="btn btn-primary" disabled={busy || check.errors.length > 0} onClick={() => run(async () => { const s = await persist(); await publishPost(s.id); await reload(s.id); }, 'Published. It is live on the site.')}>Publish now</button>
                {status !== 'archived' && (
                  <div className="ab-schedule">
                    <label className="ab-field">Publish automatically at<input type="datetime-local" value={scheduleText} onChange={(e) => setScheduleText(e.target.value)} /></label>
                    <button type="button" className="btn btn-secondary" disabled={busy || check.errors.length > 0 || !scheduleText} onClick={() => run(async () => { const s = await persist(); await schedulePost(s.id, fromLocalInput(scheduleText)); await reload(s.id); }, 'Scheduled.')}>{status === 'scheduled' ? 'Reschedule' : 'Schedule'}</button>
                    <small>Goes live within about 10 minutes of this time, even if nobody is signed in.</small>
                  </div>
                )}
              </>
            )}
            {status === 'published' && <a className="ab-link" href={`/blogs/${post.slug}`} target="_blank" rel="noreferrer">View live article</a>}
            {canTransition(status, 'draft') && status !== 'draft' && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => transition('draft', status === 'published' ? 'Unpublished. It is a draft again.' : status === 'scheduled' ? 'Schedule cancelled.' : 'Restored to draft.')}>{status === 'published' ? 'Unpublish' : status === 'scheduled' ? 'Cancel schedule' : 'Restore to draft'}</button>}
            {canTransition(status, 'archived') && status !== 'archived' && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => transition('archived', 'Archived.')}>Archive</button>}
          </Panel>
        </aside>

        {previewOpen && (
          <section className="ab-preview" aria-label="Preview">
            <div className="ab-preview__bar" role="group" aria-label="Preview width">
              {PREVIEW_WIDTHS.map((w) => (
                <button key={w.px} type="button" className="ab-chip" aria-pressed={previewWidth === w.px} onClick={() => setPreviewWidth(w.px)}>
                  <span className="material-symbols-outlined" aria-hidden="true">{w.icon}</span>{w.label}
                </button>
              ))}
            </div>
            <div className="blog-frame ab-preview__frame" style={{ maxWidth: previewWidth }}>
              <BlogArticle post={previewPost} category={categories.find((c) => c.id === post.categoryId) ?? null} preview />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
