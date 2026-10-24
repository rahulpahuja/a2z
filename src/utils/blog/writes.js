import { normalizePost, toIndexEntry, toPublicRecord } from './post.js';
import { isValidSlug } from './slug.js';

// Realtime Database layout (see database.rules.json):
//   blogs/admin/{id}        every post in every status                 (super user only)
//   blogs/slugClaims/{slug} slug -> post id, so slugs stay unique      (super user only)
//   blogs/public/{id}       the full record of a published post        (public read)
//   blogs/index/{id}        card data for the landing page             (public read)
//   blogs/slugs/{slug}      slug -> id for published posts             (public read)
//   blogs/redirects/{old}   old slug -> current slug                   (public read)
//   blogs/categories/{id}   { name, slug }                             (public read)
export const BLOG_ROOT = 'blogs';
export const blogPath = (...parts) => [BLOG_ROOT, ...parts].join('/');

// All the writes needed to make `post` live, as one multi-path update so visitors never see
// a half-published state. `redirects` is the current redirects map ({ oldSlug: targetSlug }),
// used to keep redirect chains one hop long. `previousPublishedSlug` is the slug the post was
// live under before this publish, when it changed.
export function buildPublishWrites({ post: input, now = Date.now(), previousPublishedSlug = '', redirects = {} }) {
  const post = normalizePost(input);
  if (!post.id || !isValidSlug(post.slug)) throw new Error('A post needs an id and a valid slug before it can be published.');

  const publishedAt = post.publishedAt || now;
  const live = normalizePost({ ...post, status: 'published', publishedAt, publishAt: null, updatedAt: now });
  const writes = {
    [blogPath('public', post.id)]: toPublicRecord(live),
    [blogPath('index', post.id)]: toIndexEntry(live),
    [blogPath('slugs', post.slug)]: post.id,
    // The slug is the post's own again, so it can no longer be somebody else's redirect.
    [blogPath('redirects', post.slug)]: null,
  };

  const previousSlugs = new Set(live.previousSlugs);
  if (previousPublishedSlug && previousPublishedSlug !== post.slug && isValidSlug(previousPublishedSlug)) {
    writes[blogPath('slugs', previousPublishedSlug)] = null;
    writes[blogPath('redirects', previousPublishedSlug)] = post.slug;
    previousSlugs.add(previousPublishedSlug);
    // Anything that pointed at the old slug now points straight at the new one.
    for (const [from, to] of Object.entries(redirects)) {
      if (to === previousPublishedSlug && from !== post.slug) writes[blogPath('redirects', from)] = post.slug;
    }
  }
  for (const old of previousSlugs) {
    if (old !== post.slug) writes[blogPath('redirects', old)] = post.slug;
  }
  previousSlugs.delete(post.slug);

  writes[blogPath('admin', post.id)] = { ...live, previousSlugs: [...previousSlugs].slice(0, 20) };
  return writes;
}

// Takes a post off the site (unpublish or archive). Its redirects stay, so old links still
// land on the (now missing) page rather than a different post.
export function buildUnpublishWrites({ post: input, status = 'draft', now = Date.now() }) {
  const post = normalizePost(input);
  if (!['draft', 'archived'].includes(status)) throw new Error('A post can only be unpublished to draft or archived.');
  const writes = {
    [blogPath('public', post.id)]: null,
    [blogPath('index', post.id)]: null,
    [blogPath('admin', post.id)]: { ...post, status, publishAt: null, updatedAt: now },
  };
  if (post.slug) writes[blogPath('slugs', post.slug)] = null;
  return writes;
}

// Removes a post everywhere, including the slug claim and any redirects that point at it.
export function buildDeleteWrites({ post: input, redirects = {} }) {
  const post = normalizePost(input);
  const writes = {
    [blogPath('admin', post.id)]: null,
    [blogPath('public', post.id)]: null,
    [blogPath('index', post.id)]: null,
  };
  const slugs = new Set([post.slug, ...post.previousSlugs].filter(Boolean));
  for (const slug of slugs) {
    writes[blogPath('slugClaims', slug)] = null;
    writes[blogPath('slugs', slug)] = null;
    writes[blogPath('redirects', slug)] = null;
  }
  for (const [from, to] of Object.entries(redirects)) {
    if (slugs.has(to)) writes[blogPath('redirects', from)] = null;
  }
  return writes;
}

// For the scheduler: which posts to publish now, oldest scheduled time first.
export function selectDuePosts(posts, now = Date.now()) {
  return posts
    .map(normalizePost)
    .filter((p) => p.status === 'scheduled' && Number.isFinite(p.publishAt) && p.publishAt <= now)
    .sort((a, b) => a.publishAt - b.publishAt);
}
