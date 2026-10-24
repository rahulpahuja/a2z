import { applyWrites, claimSlug, readOnce, subscribe } from './blogStore.js';
import { normalizeIndexEntry, normalizePost, toList, validatePost, createEmptyPost, duplicatePost } from '../utils/blog/post.js';
import { isValidSlug, slugFromTitle, uniqueSlug } from '../utils/blog/slug.js';
import { canTransition, validateScheduleTime } from '../utils/blog/status.js';
import { buildDeleteWrites, buildPublishWrites, buildUnpublishWrites, blogPath } from '../utils/blog/writes.js';

export class BlogError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'BlogError';
    this.code = code;
    this.details = details;
  }
}

export const newPostId = () => `blog_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const asPosts = (tree) => Object.values(tree ?? {}).map(normalizePost).filter((p) => p.id);

// ---- admin reads -------------------------------------------------------------

// Newest-edited first.
export function subscribeToAdminPosts(callback, onError) {
  return subscribe(
    blogPath('admin'),
    (tree) => callback(asPosts(tree).sort((a, b) => b.updatedAt - a.updatedAt)),
    onError
  );
}

export async function getAdminPost(id) {
  const raw = await readOnce(blogPath('admin', id));
  return raw ? normalizePost({ ...raw, id }) : null;
}

// ---- saving ------------------------------------------------------------------

async function takenSlugs(excludeId) {
  const claims = (await readOnce(blogPath('slugClaims'))) ?? {};
  return new Set(Object.entries(claims).filter(([, owner]) => owner !== excludeId).map(([slug]) => slug));
}

// Makes sure `post` has a unique valid slug, claiming it. A blank slug is generated from the title.
async function ensureSlug(post) {
  let slug = post.slug;
  if (!slug) {
    const taken = await takenSlugs(post.id);
    slug = uniqueSlug(slugFromTitle(post.title, post.id), (s) => taken.has(s));
  }
  if (!isValidSlug(slug)) throw new BlogError('invalid_slug', 'The URL slug may only contain lower-case letters, numbers and single hyphens.');
  if (!(await claimSlug(slug, post.id))) throw new BlogError('slug_taken', `The slug "${slug}" is already used by another article.`);
  return slug;
}

// Saves the article. A published article stays live: saving updates the public copy too, keeping the
// original publication date and adding a redirect if the slug changed.
export async function savePost(input, { now = Date.now() } = {}) {
  let post = normalizePost(input);
  if (!post.id) throw new BlogError('missing_id', 'The article has no id.');
  // A draft may be incomplete, but it needs a title (and respects the product limit for its type).
  const { errors } = validatePost(post, { forPublish: false });
  const blocking = errors.filter((e) => e.field === 'title' || e.field === 'products');
  if (blocking.length) throw new BlogError('invalid', blocking[0].message, blocking);

  const existing = await getAdminPost(post.id);
  post = { ...post, slug: await ensureSlug(post), createdAt: existing?.createdAt || post.createdAt || now, updatedAt: now };

  // A draft that never went live can drop its old slug claim; a slug that has been public keeps redirecting.
  if (existing?.slug && existing.slug !== post.slug && existing.status !== 'published' && !post.previousSlugs.includes(existing.slug)) {
    await applyWrites({ [blogPath('slugClaims', existing.slug)]: null });
  }

  if (existing?.status === 'published' || post.status === 'published') {
    const publishErrors = validatePost(post, { forPublish: true }).errors;
    if (publishErrors.length) throw new BlogError('not_publishable', publishErrors[0].message, publishErrors);
    return publishInternal(post, existing, now);
  }
  const saved = normalizePost({ ...post, publishedAt: post.status === 'archived' ? post.publishedAt : null });
  await applyWrites({ [blogPath('admin', saved.id)]: saved });
  return saved;
}

async function publishInternal(post, existing, now) {
  const livePublic = await readOnce(blogPath('public', post.id));
  const redirects = (await readOnce(blogPath('redirects'))) ?? {};
  const writes = buildPublishWrites({
    post: { ...post, publishedAt: existing?.publishedAt || post.publishedAt || now },
    now,
    previousPublishedSlug: livePublic?.slug && livePublic.slug !== post.slug ? livePublic.slug : '',
    redirects,
  });
  await applyWrites(writes);
  return normalizePost(writes[blogPath('admin', post.id)]);
}

export function createDraft(type = 'general', { now = Date.now() } = {}) {
  return createEmptyPost({ id: newPostId(), type, now });
}

// ---- transitions ---------------------------------------------------------------

async function loadForTransition(id, to) {
  const post = await getAdminPost(id);
  if (!post) throw new BlogError('not_found', 'That article no longer exists.');
  if (!canTransition(post.status, to)) throw new BlogError('bad_transition', `A ${post.status} article cannot become ${to}.`);
  return post;
}

export async function publishPost(id, { now = Date.now() } = {}) {
  const post = await loadForTransition(id, 'published');
  const errors = validatePost(post, { forPublish: true }).errors;
  if (errors.length) throw new BlogError('not_publishable', errors[0].message, errors);
  const slug = await ensureSlug(post);
  return publishInternal({ ...post, slug, status: 'published', publishAt: null }, post, now);
}

export async function schedulePost(id, publishAt, { now = Date.now() } = {}) {
  const post = await loadForTransition(id, 'scheduled');
  const timeError = validateScheduleTime(publishAt, now);
  if (timeError) throw new BlogError('bad_time', timeError);
  const errors = validatePost(post, { forPublish: true }).errors;
  if (errors.length) throw new BlogError('not_publishable', errors[0].message, errors);
  const slug = await ensureSlug(post);
  const scheduled = normalizePost({ ...post, slug, status: 'scheduled', publishAt, updatedAt: now });
  await applyWrites({ [blogPath('admin', id)]: scheduled });
  return scheduled;
}

// 'draft' (unpublish) or 'archived'.
export async function unpublishPost(id, status = 'draft', { now = Date.now() } = {}) {
  const post = await loadForTransition(id, status);
  const writes = buildUnpublishWrites({ post, status, now });
  await applyWrites(writes);
  return normalizePost(writes[blogPath('admin', id)]);
}

export async function deletePost(id) {
  const post = await getAdminPost(id);
  if (!post) return;
  const redirects = (await readOnce(blogPath('redirects'))) ?? {};
  await applyWrites(buildDeleteWrites({ post, redirects }));
}

export async function duplicate(id, { now = Date.now() } = {}) {
  const source = await getAdminPost(id);
  if (!source) throw new BlogError('not_found', 'That article no longer exists.');
  const copy = duplicatePost(source, { id: newPostId(), now });
  return savePost(copy, { now });
}

// ---- categories ------------------------------------------------------------------

export function subscribeToCategories(callback, onError) {
  return subscribe(
    blogPath('categories'),
    (tree) => callback(Object.entries(tree ?? {}).map(([id, c]) => ({ id, name: String(c?.name ?? ''), slug: String(c?.slug ?? '') })).filter((c) => c.name).sort((a, b) => a.name.localeCompare(b.name))),
    onError
  );
}

export async function saveCategory({ id, name }) {
  const clean = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!clean) throw new BlogError('invalid', 'Give the category a name.');
  const slug = slugFromTitle(clean, id);
  const categoryId = id || slug;
  await applyWrites({ [blogPath('categories', categoryId)]: { name: clean, slug } });
  return { id: categoryId, name: clean, slug };
}

export async function deleteCategory(id) {
  await applyWrites({ [blogPath('categories', id)]: null });
}

// ---- public reads ------------------------------------------------------------------

// Published articles, newest first, as lightweight card records.
export function subscribeToBlogIndex(callback, onError) {
  return subscribe(
    blogPath('index'),
    (tree) => callback(Object.values(tree ?? {}).map(normalizeIndexEntry).filter((e) => e.id && e.slug && e.title).sort((a, b) => b.publishedAt - a.publishedAt)),
    onError
  );
}

// { status: 'ok', post } | { status: 'redirect', slug } | { status: 'notfound' }
export async function fetchPublishedBySlug(slug) {
  const clean = String(slug ?? '').toLowerCase();
  if (!isValidSlug(clean)) return { status: 'notfound' };
  const id = await readOnce(blogPath('slugs', clean));
  if (id) {
    const record = await readOnce(blogPath('public', id));
    if (record && record.status === 'published') return { status: 'ok', post: normalizePost({ ...record, id }) };
  }
  const target = await readOnce(blogPath('redirects', clean));
  if (target && isValidSlug(target) && target !== clean) return { status: 'redirect', slug: target };
  return { status: 'notfound' };
}

export { toList };
