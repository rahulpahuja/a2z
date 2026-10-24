import { docToPlainText, extractHeadings, makeExcerpt } from '../utils/blog/doc.js';
import { effectiveExcerpt } from '../utils/blog/post.js';
import { BRAND_NAME, DEFAULT_ROBOTS, NOINDEX_ROBOTS, SITE_URL } from './routes.js';
import { escapeAttr } from './head.js';

const DESCRIPTION_MAX = 160;
const NOSCRIPT_TEXT_MAX = 4000;

export const blogUrl = (slug) => `${SITE_URL}/blogs/${encodeURIComponent(slug)}`;
const iso = (ms) => (Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : undefined);
const absolute = (src) => (typeof src === 'string' && src.startsWith('https://') ? src : undefined);

// Head, structured data and crawlable copy for a published article. Everything comes from the article
// the visitor sees; product structured data is deliberately not added here, because it belongs to the
// product pages and duplicating it would claim things this page does not show.
export function buildBlogPostHead(post, { categoryName = '' } = {}) {
  const url = blogUrl(post.slug);
  const title = post.seoTitle || post.title;
  const description = makeExcerpt(post.seoDescription || effectiveExcerpt(post), DESCRIPTION_MAX);
  const image = absolute(post.ogImage) || absolute(post.coverImage);
  const published = iso(post.publishedAt);
  const modified = iso(post.updatedAt) || published;

  const article = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title.slice(0, 110),
    description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(image ? { image: [image] } : {}),
    ...(published ? { datePublished: published } : {}),
    ...(modified ? { dateModified: modified } : {}),
    author: post.author ? { '@type': 'Person', name: post.author } : { '@type': 'Organization', name: BRAND_NAME },
    publisher: { '@type': 'Organization', name: BRAND_NAME, url: `${SITE_URL}/` },
    ...(post.tags?.length ? { keywords: post.tags.join(', ') } : {}),
  };

  const crumbs = [
    { name: 'Home', item: `${SITE_URL}/` },
    { name: 'Blog', item: `${SITE_URL}/blogs` },
    ...(categoryName ? [{ name: categoryName, item: `${SITE_URL}/blogs` }] : []),
    { name: post.title, item: url },
  ];
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })),
  };

  return {
    title: title.includes(BRAND_NAME) ? title : `${title} | ${BRAND_NAME}`,
    description,
    canonical: url,
    robots: DEFAULT_ROBOTS,
    ogType: 'article',
    ogImage: image,
    jsonLd: [article, breadcrumbs],
    noscript: blogNoscript(post, description),
  };
}

// Text for clients without JavaScript: title, summary, section headings and the opening of the article.
function blogNoscript(post, description) {
  const headings = extractHeadings(post.body).map((h) => `<li>${escapeAttr(h.text)}</li>`).join('');
  const text = docToPlainText(post.body).slice(0, NOSCRIPT_TEXT_MAX);
  return `<article><h1>${escapeAttr(post.title)}</h1><p>${escapeAttr(description)}</p>${headings ? `<ul>${headings}</ul>` : ''}<p>${escapeAttr(text)}</p></article>`;
}

// The head for a missing or unpublished article: a 404 that is never indexed.
export function blogNotFoundHead() {
  return {
    title: `Article not found | ${BRAND_NAME}`,
    description: 'This article could not be found.',
    canonical: null,
    robots: NOINDEX_ROBOTS,
    ogType: 'website',
    jsonLd: [],
    noscript: '',
  };
}
