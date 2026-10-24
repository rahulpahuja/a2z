import { Link } from 'react-router-dom';
import { getBlogType } from '../../utils/blog/types.js';
import { formatPublishedDate } from '../../utils/blog/related.js';

// A card for the landing page and the "keep reading" shelves. `onOpen` lets the page record where the
// click came from.
export default function BlogCard({ entry, categoryName = '', variant = 'default', onOpen }) {
  const type = getBlogType(entry.type);
  const date = formatPublishedDate(entry.publishedAt);
  return (
    <article className={`blog-card blog-card--${variant}`}>
      <Link to={`/blogs/${entry.slug}`} className="blog-card__link" onClick={() => onOpen?.(entry)}>
        <div className="blog-card__media">
          {entry.coverImage ? (
            <img src={entry.coverImage} alt={entry.coverAlt || ''} loading={variant === 'featured' ? 'eager' : 'lazy'} decoding="async" />
          ) : (
            <span className="material-symbols-outlined blog-card__placeholder" aria-hidden="true">{type.icon}</span>
          )}
        </div>
        <div className="blog-card__body">
          <p className="blog-card__kicker">
            <span className="material-symbols-outlined" aria-hidden="true">{type.icon}</span>
            {categoryName || type.label}
          </p>
          <h3 className="blog-card__title">{entry.title}</h3>
          {entry.excerpt && <p className="blog-card__excerpt">{entry.excerpt}</p>}
          <p className="blog-card__meta">
            {[entry.author, date, `${entry.readingMinutes} min read`].filter(Boolean).join(' · ')}
          </p>
          {entry.productCount > 0 && (
            <p className="blog-card__products">
              <span className="material-symbols-outlined" aria-hidden="true">shopping_bag</span>
              {entry.productCount} {entry.productCount === 1 ? 'product' : 'products'} featured
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
