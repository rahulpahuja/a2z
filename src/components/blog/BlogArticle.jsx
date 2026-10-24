import { useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext.jsx';
import { collectReferences, extractHeadings, readingMinutes, docToPlainText } from '../../utils/blog/doc.js';
import { effectiveExcerpt } from '../../utils/blog/post.js';
import { getBlogType } from '../../utils/blog/types.js';
import { buildBlogUrl, formatPublishedDate, getNeighbours, pickRelatedPosts } from '../../utils/blog/related.js';
import { shareLink } from '../../utils/shotShare.js';
import { BlogCollectionCard, BlogProductCard } from './BlogCards.jsx';
import BlogCard from './BlogCard.jsx';
import BlogRenderer from './BlogRenderer.jsx';
import { BlogTrackerProvider, useBlogTracker } from './BlogTracker.jsx';
import { useReadDepth } from './useReadDepth.js';
import './blog.css';

function ShareBar({ post }) {
  const { showToast } = useToast();
  const tracker = useBlogTracker();
  const url = buildBlogUrl(post.slug, typeof window === 'undefined' ? 'https://www.thea2zcollection.com' : window.location.origin);
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(post.title);

  const handleShare = async () => {
    const result = await shareLink({ title: post.title, text: post.title, url });
    tracker.share(result);
    if (result === 'copied') showToast('Link copied.');
    else if (result === 'failed') showToast('Could not share this article.');
  };
  const links = [
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${text}%20${encoded}` },
    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}` },
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?url=${encoded}&text=${text}` },
  ];
  return (
    <div className="blog-share" role="group" aria-label="Share this article">
      <button type="button" className="blog-share__btn" onClick={handleShare}>
        <span className="material-symbols-outlined" aria-hidden="true">share</span>
        Share
      </button>
      {links.map((l) => (
        <a key={l.id} className="blog-share__btn" href={l.href} target="_blank" rel="noopener noreferrer" onClick={() => tracker.share(l.id)}>
          {l.label}
        </a>
      ))}
    </div>
  );
}

function ArticleInner({ post, category, entries, preview }) {
  const tracker = useBlogTracker();
  const type = getBlogType(post.type);
  const bodyRef = useRef(null);
  const headings = useMemo(() => extractHeadings(post.body).filter((h) => h.level <= 3), [post.body]);
  const inline = useMemo(() => collectReferences(post.body), [post.body]);
  const minutes = useMemo(() => readingMinutes(docToPlainText(post.body)), [post.body]);
  const related = useMemo(() => pickRelatedPosts(post, entries), [post, entries]);
  const { newer, older } = useMemo(() => getNeighbours(post, entries), [post, entries]);
  const date = formatPublishedDate(post.publishedAt);
  const excerpt = effectiveExcerpt(post);

  // Products tied to the article but not already shown inside it, with the hero product first.
  const shopIds = useMemo(() => {
    const ordered = post.heroProductId ? [post.heroProductId, ...post.productIds.filter((id) => id !== post.heroProductId)] : post.productIds;
    return ordered.filter((id) => !inline.productIds.includes(id));
  }, [post, inline]);
  const collectionIds = post.collectionIds.filter((id) => !inline.collectionIds.includes(id));

  useReadDepth(bodyRef, tracker.depth, !preview);

  const goToHeading = useCallback(
    (event, id) => {
      event.preventDefault();
      tracker.toc(id);
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', `#${id}`);
      }
    },
    [tracker]
  );

  return (
    <article className="blog-article">
      <nav className="blog-crumbs" aria-label="Breadcrumb">
        <ol>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/blogs">Blog</Link></li>
          {category && <li><Link to={`/blogs?category=${encodeURIComponent(category.id)}`}>{category.name}</Link></li>}
          <li aria-current="page">{post.title}</li>
        </ol>
      </nav>

      <header className="blog-header">
        <p className="blog-header__type">
          <span className="material-symbols-outlined" aria-hidden="true">{type.icon}</span>
          {type.label}
        </p>
        <h1 className="blog-header__title">{post.title || 'Untitled article'}</h1>
        {excerpt && <p className="blog-header__excerpt">{excerpt}</p>}
        <p className="blog-header__meta">{[post.author && `By ${post.author}`, date || (preview ? 'Not published yet' : ''), `${minutes} min read`].filter(Boolean).join(' · ')}</p>
      </header>

      {post.coverImage && (
        <figure className="blog-cover">
          <img src={post.coverImage} alt={post.coverAlt || ''} fetchPriority="high" decoding="async" />
        </figure>
      )}

      {headings.length >= 3 && (
        <nav className="blog-toc" aria-label="Table of contents">
          <details open>
            <summary>In this article</summary>
            <ol>
              {headings.map((h) => (
                <li key={h.id} className={h.level === 3 ? 'blog-toc__sub' : undefined}>
                  <a href={`#${h.id}`} onClick={(e) => goToHeading(e, h.id)}>{h.text}</a>
                </li>
              ))}
            </ol>
          </details>
        </nav>
      )}

      <div ref={bodyRef}>
        <BlogRenderer doc={post.body} post={post} />
      </div>

      {shopIds.length > 0 && (
        <section className="blog-section" aria-labelledby="blog-shop-title">
          <h2 id="blog-shop-title">Shop {post.type === 'guide' || post.type === 'gift' ? 'the guide' : 'this article'}</h2>
          <div className="blog-products-grid">
            {shopIds.map((id) => (
              <BlogProductCard key={id} productId={id} placement={id === post.heroProductId ? 'hero' : 'related'} />
            ))}
          </div>
        </section>
      )}

      {collectionIds.length > 0 && (
        <section className="blog-section" aria-labelledby="blog-collections-title">
          <h2 id="blog-collections-title">Related collections</h2>
          <div className="blog-products-grid">
            {collectionIds.map((id) => <BlogCollectionCard key={id} collectionId={id} />)}
          </div>
        </section>
      )}

      {post.tags.length > 0 && (
        <ul className="blog-tags" aria-label="Tags">
          {post.tags.map((tag) => (
            <li key={tag}><Link to={`/blogs?tag=${encodeURIComponent(tag)}`}>#{tag}</Link></li>
          ))}
        </ul>
      )}

      <ShareBar post={post} />

      <aside className="blog-cta" aria-label="Keep shopping">
        <p className="blog-cta__title">Ready to shop?</p>
        <div className="blog-cta__actions">
          <Link to="/products" className="blog-cta__primary" onClick={() => tracker.cta('shop_all')}>Shop all products</Link>
          {post.primaryCollectionId && (
            <Link to={`/collections/${encodeURIComponent(post.primaryCollectionId)}`} className="blog-cta__secondary" onClick={() => tracker.cta('shop_collection')}>
              Explore the collection
            </Link>
          )}
          <Link to="/blogs" className="blog-cta__secondary" onClick={() => tracker.cta('back_to_blog')}>More articles</Link>
        </div>
      </aside>

      {!preview && (newer || older) && (
        <nav className="blog-neighbours" aria-label="More articles">
          {older ? (
            <Link to={`/blogs/${older.slug}`} className="blog-neighbours__link" onClick={() => tracker.card(older, 'prev_next')}>
              <span>Older article</span>
              <strong>{older.title}</strong>
            </Link>
          ) : <span />}
          {newer ? (
            <Link to={`/blogs/${newer.slug}`} className="blog-neighbours__link blog-neighbours__link--next" onClick={() => tracker.card(newer, 'prev_next')}>
              <span>Newer article</span>
              <strong>{newer.title}</strong>
            </Link>
          ) : <span />}
        </nav>
      )}

      {!preview && related.length > 0 && (
        <section className="blog-section" aria-labelledby="blog-related-title">
          <h2 id="blog-related-title">Keep reading</h2>
          <div className="blog-grid">
            {related.map((entry) => (
              <BlogCard key={entry.id} entry={entry} onOpen={(e) => tracker.card(e, 'related')} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

// `preview` is used by the admin editor: nothing is tracked, and the "keep reading" sections are hidden.
export default function BlogArticle({ post, category = null, entries = [], preview = false }) {
  return (
    <BlogTrackerProvider post={post} enabled={!preview}>
      <ArticleInner post={post} category={category} entries={entries} preview={preview} />
    </BlogTrackerProvider>
  );
}
