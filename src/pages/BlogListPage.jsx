import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TopNav from '../components/TopNav.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import BlogCard from '../components/blog/BlogCard.jsx';
import { subscribeToBlogIndex, subscribeToCategories } from '../services/blog.js';
import { filterEntries, topTags } from '../utils/blog/related.js';
import { GUIDE_TYPES } from '../utils/blog/types.js';
import { logBlogCardClick, logBlogFilter, logBlogListView, logBlogLoadMore, logBlogSearch } from '../services/analytics.js';
import '../components/blog/blog.css';

const PAGE_SIZE = 9;
const SHELF_SIZE = 3;
const SEARCH_DEBOUNCE_MS = 400;

export default function BlogListPage() {
  const [params, setParams] = useSearchParams();
  const [entries, setEntries] = useState(null);
  const [categories, setCategories] = useState([]);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const query = params.get('q') ?? '';
  const categoryId = params.get('category') ?? '';
  const tag = params.get('tag') ?? '';
  const [term, setTerm] = useState(query);
  const listViewed = useRef(false);

  useEffect(() => subscribeToBlogIndex(setEntries, () => { setFailed(true); setEntries([]); }), []);
  useEffect(() => subscribeToCategories(setCategories), []);

  useEffect(() => {
    if (entries && !listViewed.current) {
      listViewed.current = true;
      logBlogListView(entries.length);
    }
  }, [entries]);

  const update = (changes) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
      return next;
    }, { replace: true });

  // The URL follows the search box a moment after typing stops, so every keystroke is not a search.
  useEffect(() => {
    if (term.trim() === query.trim()) return undefined;
    const timer = setTimeout(() => {
      update({ q: term.trim() });
      setVisible(PAGE_SIZE);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, query]);

  const all = entries ?? [];
  const categoryName = (id) => categories.find((c) => c.id === id)?.name ?? '';
  const filtered = useMemo(() => filterEntries(all, { query, categoryId, tag }), [all, query, categoryId, tag]);
  const filtering = Boolean(query.trim() || categoryId || tag);

  useEffect(() => {
    if (query.trim() && entries) logBlogSearch(query.trim(), filtered.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const tags = useMemo(() => topTags(all), [all]);
  const usedCategories = categories.filter((c) => all.some((e) => e.categoryId === c.id));

  const featured = !filtering ? all.find((e) => e.featured) ?? all[0] : null;
  const guides = !filtering ? all.filter((e) => e !== featured && GUIDE_TYPES.has(e.type)).slice(0, SHELF_SIZE) : [];
  const stories = !filtering ? all.filter((e) => e !== featured && e.type === 'collection').slice(0, SHELF_SIZE) : [];
  const gridSource = filtering ? filtered : all.filter((e) => e !== featured);
  const shown = gridSource.slice(0, visible);

  const pick = (kind, value) => {
    const key = kind === 'category' ? 'category' : 'tag';
    const next = (kind === 'category' ? categoryId : tag) === value ? '' : value;
    logBlogFilter(kind, next);
    update({ [key]: next });
    setVisible(PAGE_SIZE);
  };
  const clearAll = () => {
    logBlogFilter('clear', '');
    setTerm('');
    update({ q: '', category: '', tag: '' });
    setVisible(PAGE_SIZE);
  };
  const open = (source) => (entry) => logBlogCardClick(entry, source);

  return (
    <>
      <TopNav />
      <main className="blog-frame">
        <div className="blog-landing">
          <header className="blog-landing__head">
            <h1>The A2Z Journal</h1>
            <p>Style guides, buying advice and stories from our collections.</p>
          </header>

          <div className="blog-toolbar">
            <form className="blog-search" role="search" onSubmit={(e) => e.preventDefault()}>
              <span className="material-symbols-outlined" aria-hidden="true">search</span>
              <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search articles" aria-label="Search articles" />
            </form>
            {usedCategories.length > 0 && (
              <div className="blog-chips" role="group" aria-label="Filter by category">
                {usedCategories.map((c) => (
                  <button key={c.id} type="button" className="blog-chip" aria-pressed={categoryId === c.id} onClick={() => pick('category', c.id)}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {tags.length > 0 && (
            <div className="blog-chips" role="group" aria-label="Filter by tag">
              {tags.map(({ tag: t }) => (
                <button key={t} type="button" className="blog-chip" aria-pressed={tag === t} onClick={() => pick('tag', t)}>
                  #{t}
                </button>
              ))}
            </div>
          )}

          {entries === null ? (
            <p className="blog-empty" role="status">Loading articles…</p>
          ) : failed ? (
            <p className="blog-empty" role="alert">The articles could not be loaded. Please try again in a moment.</p>
          ) : all.length === 0 ? (
            <p className="blog-empty">No articles yet — check back soon.</p>
          ) : (
            <>
              {featured && (
                <section className="blog-landing__section" aria-label="Featured article">
                  <BlogCard entry={featured} variant="featured" categoryName={categoryName(featured.categoryId)} onOpen={open('featured')} />
                </section>
              )}
              {guides.length > 0 && (
                <section className="blog-landing__section" aria-labelledby="blog-guides">
                  <h2 id="blog-guides">Product guides</h2>
                  <div className="blog-grid">
                    {guides.map((e) => <BlogCard key={e.id} entry={e} categoryName={categoryName(e.categoryId)} onOpen={open('guides')} />)}
                  </div>
                </section>
              )}
              {stories.length > 0 && (
                <section className="blog-landing__section" aria-labelledby="blog-stories">
                  <h2 id="blog-stories">Collection stories</h2>
                  <div className="blog-grid">
                    {stories.map((e) => <BlogCard key={e.id} entry={e} categoryName={categoryName(e.categoryId)} onOpen={open('collections')} />)}
                  </div>
                </section>
              )}
              <section className="blog-landing__section" aria-labelledby="blog-all">
                <h2 id="blog-all">{filtering ? `${filtered.length} ${filtered.length === 1 ? 'result' : 'results'}` : 'Latest articles'}</h2>
                {filtering && (
                  <p><button type="button" className="blog-chip" onClick={clearAll}>Clear search and filters</button></p>
                )}
                {shown.length === 0 ? (
                  <p className="blog-empty">{filtering ? 'No articles match. Try different words or clear the filters.' : 'No other articles yet.'}</p>
                ) : (
                  <div className="blog-grid">
                    {shown.map((e) => <BlogCard key={e.id} entry={e} categoryName={categoryName(e.categoryId)} onOpen={open('grid')} />)}
                  </div>
                )}
                {gridSource.length > shown.length && (
                  <button
                    type="button"
                    className="blog-more"
                    onClick={() => {
                      logBlogLoadMore(shown.length + PAGE_SIZE);
                      setVisible((n) => n + PAGE_SIZE);
                    }}
                  >
                    Load more ({gridSource.length - shown.length} left)
                  </button>
                )}
              </section>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
