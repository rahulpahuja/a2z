import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import TopNav from '../components/TopNav.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import BlogArticle from '../components/blog/BlogArticle.jsx';
import { fetchPublishedBySlug, subscribeToBlogIndex, subscribeToCategories } from '../services/blog.js';
import { buildBlogPostHead, blogNotFoundHead } from '../seo/blogHead.js';
import { applyDocumentHead } from '../seo/head.js';
import { logBlogView, logPageNotFound } from '../services/analytics.js';

export default function BlogPostPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', post: null });
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);

  // Resolve the slug: the article, a redirect from an old slug, or a 404.
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', post: null });
    fetchPublishedBySlug(slug)
      .then((result) => {
        if (cancelled) return;
        if (result.status === 'redirect') navigate(`/blogs/${result.slug}`, { replace: true });
        else setState({ status: result.status, post: result.post ?? null });
      })
      .catch(() => !cancelled && setState({ status: 'error', post: null }));
    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  useEffect(() => subscribeToBlogIndex(setEntries), []);
  useEffect(() => subscribeToCategories(setCategories), []);

  const { status, post } = state;
  const category = post ? categories.find((c) => c.id === post.categoryId) ?? null : null;

  useEffect(() => {
    if (post) applyDocumentHead(buildBlogPostHead(post, { categoryName: category?.name }));
    else if (status === 'notfound') applyDocumentHead(blogNotFoundHead());
  }, [post, status, category?.name]);

  useEffect(() => {
    if (post) logBlogView({ ...post, readingMinutes: entries.find((e) => e.id === post.id)?.readingMinutes });
    else if (status === 'notfound') logPageNotFound(`/blogs/${slug}`);
    // Counted once per article opened, not again when the related lists load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id, status]);

  return (
    <>
      <TopNav />
      <main className="blog-frame">
        {status === 'loading' && <p className="blog-empty" role="status">Loading article…</p>}
        {status === 'ok' && post && <BlogArticle post={post} category={category} entries={entries} />}
        {(status === 'notfound' || status === 'error') && (
          <div className="blog-empty" role={status === 'error' ? 'alert' : undefined}>
            <h1>{status === 'error' ? 'This article could not be loaded' : 'Article not found'}</h1>
            <p>{status === 'error' ? 'Please check your connection and try again.' : 'It may have been moved or is no longer published.'}</p>
            <p><Link to="/blogs">Read our other articles</Link></p>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
