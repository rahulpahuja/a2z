import { docToPlainText, isDocEmpty, makeExcerpt, parseBody, readingMinutes, sanitizeDoc, serializeDoc } from './doc.js';
import { isValidSlug } from './slug.js';
import { isStatus } from './status.js';
import { getBlogType, isBlogType, validateAssociations } from './types.js';

export const POST_LIMITS = {
  title: 160,
  excerpt: 320,
  author: 80,
  seoTitle: 70,
  seoDescription: 170,
  tagCount: 12,
  tagLength: 40,
  productIds: 60,
  collectionIds: 10,
  coverAlt: 200,
};

export const SEO_RANGES = { title: { min: 30, max: 60 }, description: { min: 70, max: 160 } };

const ID_PATTERN = /^[\w-]{1,128}$/;
const TAG_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} &'+-]*$/u;

// RTDB returns arrays as objects when sparse and drops empty ones.
export function toList(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    return Object.keys(value).sort((a, b) => Number(a) - Number(b)).map((k) => value[k]);
  }
  return [];
}

const str = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const num = (value) => (Number.isFinite(Number(value)) && value !== null && value !== '' && value !== undefined ? Number(value) : null);

function idList(value, max) {
  const out = [];
  for (const item of toList(value)) {
    const id = String(item ?? '');
    if (ID_PATTERN.test(id) && !out.includes(id)) out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

export function normalizeTags(value) {
  const out = [];
  for (const raw of toList(value)) {
    const tag = str(raw, POST_LIMITS.tagLength).toLowerCase();
    if (tag && TAG_PATTERN.test(tag) && !out.includes(tag)) out.push(tag);
    if (out.length >= POST_LIMITS.tagCount) break;
  }
  return out;
}

export function createEmptyPost({ id, type = 'general', now = Date.now() } = {}) {
  return normalizePost({ id, type, title: '', status: 'draft', createdAt: now, updatedAt: now });
}

// Brings any stored value (or a half-filled form) to the canonical shape.
export function normalizePost(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const productIds = idList(r.productIds, POST_LIMITS.productIds);
  const collectionIds = idList(r.collectionIds, POST_LIMITS.collectionIds);
  const heroProductId = ID_PATTERN.test(String(r.heroProductId ?? '')) ? String(r.heroProductId) : '';
  const primaryCollectionId = ID_PATTERN.test(String(r.primaryCollectionId ?? '')) ? String(r.primaryCollectionId) : '';
  return {
    id: ID_PATTERN.test(String(r.id ?? '')) ? String(r.id) : '',
    type: isBlogType(r.type) ? r.type : 'general',
    title: str(r.title, POST_LIMITS.title),
    slug: String(r.slug ?? '').trim().toLowerCase(),
    excerpt: str(r.excerpt, POST_LIMITS.excerpt),
    coverImage: typeof r.coverImage === 'string' ? r.coverImage.trim().slice(0, 2000) : '',
    coverAlt: str(r.coverAlt, POST_LIMITS.coverAlt),
    body: serializeDoc(parseBody(r.body)),
    author: str(r.author, POST_LIMITS.author),
    categoryId: ID_PATTERN.test(String(r.categoryId ?? '')) ? String(r.categoryId) : '',
    tags: normalizeTags(r.tags),
    productIds,
    collectionIds,
    heroProductId: productIds.includes(heroProductId) ? heroProductId : '',
    primaryCollectionId: collectionIds.includes(primaryCollectionId) ? primaryCollectionId : '',
    featured: Boolean(r.featured),
    seoTitle: str(r.seoTitle, POST_LIMITS.seoTitle),
    seoDescription: str(r.seoDescription, POST_LIMITS.seoDescription),
    ogImage: typeof r.ogImage === 'string' ? r.ogImage.trim().slice(0, 2000) : '',
    status: isStatus(r.status) ? r.status : 'draft',
    publishedAt: num(r.publishedAt),
    publishAt: num(r.publishAt),
    createdAt: num(r.createdAt) ?? 0,
    updatedAt: num(r.updatedAt) ?? 0,
    // Slugs this post used while published; kept so they can keep redirecting.
    previousSlugs: toList(r.previousSlugs).filter((s) => isValidSlug(s)).slice(0, 20),
  };
}

// Problems that block publishing, and softer warnings. Drafts can be saved with neither.
export function validatePost(input, { forPublish = false } = {}) {
  const post = normalizePost(input);
  const errors = [];
  const warnings = [];
  const add = (list, field, message) => list.push({ field, message });

  if (!post.title) add(errors, 'title', 'Add a title.');
  if (!post.slug) add(errors, 'slug', 'Add a URL slug.');
  else if (!isValidSlug(post.slug)) add(errors, 'slug', 'The URL slug may only contain lower-case letters, numbers and single hyphens.');

  const assoc = validateAssociations(post.type, post, { requireForPublish: forPublish });
  assoc.forEach((message) => add(errors, 'products', message));

  if (forPublish) {
    if (isDocEmpty(post.body)) add(errors, 'body', 'The article is empty.');
    if (!post.author) add(warnings, 'author', 'No author name is set.');
    if (!post.coverImage) add(warnings, 'coverImage', 'No cover image: cards and shared links will use a plain placeholder.');
    else if (!post.coverAlt) add(warnings, 'coverAlt', 'The cover image has no alt text.');
    if (!post.excerpt) add(warnings, 'excerpt', 'No excerpt: one will be taken from the start of the article.');
    if (!post.categoryId) add(warnings, 'categoryId', 'No category selected.');
    const t = (post.seoTitle || post.title).length;
    if (t > SEO_RANGES.title.max) add(warnings, 'seoTitle', `The title is ${t} characters; search results usually cut off after about ${SEO_RANGES.title.max}.`);
    const d = (post.seoDescription || post.excerpt).length;
    if (d && (d < SEO_RANGES.description.min || d > SEO_RANGES.description.max)) add(warnings, 'seoDescription', `The description is ${d} characters; aim for ${SEO_RANGES.description.min}–${SEO_RANGES.description.max}.`);
  }
  return { errors, warnings };
}

// The excerpt shown on cards and in search results: the author's, or the start of the body.
export function effectiveExcerpt(post) {
  return post.excerpt || makeExcerpt(docToPlainText(post.body), 160);
}

export function effectiveCover(post, { fallback = '' } = {}) {
  return post.coverImage || fallback;
}

// ---- stored shapes ------------------------------------------------------------

const SEARCH_TEXT_LENGTH = 3000;

// The lightweight card record the landing page loads for every published post.
export function toIndexEntry(input) {
  const post = normalizePost(input);
  const plain = docToPlainText(post.body);
  return {
    id: post.id,
    slug: post.slug,
    type: post.type,
    title: post.title,
    excerpt: effectiveExcerpt(post),
    coverImage: post.coverImage,
    coverAlt: post.coverAlt,
    author: post.author,
    categoryId: post.categoryId,
    tags: post.tags,
    publishedAt: post.publishedAt ?? 0,
    featured: post.featured,
    productCount: post.productIds.length,
    heroProductId: post.heroProductId,
    primaryCollectionId: post.primaryCollectionId,
    readingMinutes: readingMinutes(plain),
    searchText: plain.slice(0, SEARCH_TEXT_LENGTH),
  };
}

// Brings a stored index record to a known shape (the index is public, so treat it as untrusted too).
export function normalizeIndexEntry(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const p = normalizePost({ ...r, body: '' });
  return {
    id: p.id,
    slug: p.slug,
    type: p.type,
    title: p.title,
    excerpt: str(r.excerpt, POST_LIMITS.excerpt),
    coverImage: p.coverImage,
    coverAlt: p.coverAlt,
    author: p.author,
    categoryId: p.categoryId,
    tags: p.tags,
    publishedAt: p.publishedAt ?? 0,
    featured: p.featured,
    productCount: Number.isInteger(r.productCount) && r.productCount >= 0 ? r.productCount : 0,
    heroProductId: p.heroProductId,
    primaryCollectionId: p.primaryCollectionId,
    readingMinutes: Number.isInteger(r.readingMinutes) && r.readingMinutes > 0 ? r.readingMinutes : 1,
    searchText: String(r.searchText ?? '').slice(0, SEARCH_TEXT_LENGTH),
  };
}

// What visitors read: no drafts' bookkeeping, only published content.
export function toPublicRecord(input) {
  const post = normalizePost(input);
  return {
    id: post.id,
    slug: post.slug,
    type: post.type,
    title: post.title,
    excerpt: effectiveExcerpt(post),
    body: serializeDoc(sanitizeDoc(post.body)),
    coverImage: post.coverImage,
    coverAlt: post.coverAlt,
    author: post.author,
    categoryId: post.categoryId,
    tags: post.tags,
    productIds: post.productIds,
    collectionIds: post.collectionIds,
    heroProductId: post.heroProductId,
    primaryCollectionId: post.primaryCollectionId,
    featured: post.featured,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    ogImage: post.ogImage,
    status: 'published',
    publishedAt: post.publishedAt ?? 0,
    updatedAt: post.updatedAt,
  };
}

// A new draft copied from an existing post. Never inherits the slug or publication state.
export function duplicatePost(input, { id, now = Date.now() }) {
  const source = normalizePost(input);
  return normalizePost({
    ...source,
    id,
    title: `Copy of ${source.title}`.slice(0, POST_LIMITS.title),
    slug: '',
    status: 'draft',
    publishedAt: null,
    publishAt: null,
    featured: false,
    createdAt: now,
    updatedAt: now,
    previousSlugs: [],
  });
}

export const typeLabel = (type) => getBlogType(type).label;
