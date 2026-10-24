// Publishes blog articles straight to the Realtime Database with the Admin SDK, using the same validation and
// multi-path write the editor and the scheduled function use (src/utils/blog).
//
//   node scripts/publish-blog-article.mjs <article.mjs>...            dry run: validates and lists the writes
//   node scripts/publish-blog-article.mjs <article.mjs>... --apply    writes to the database
//
// --apply needs FIREBASE_SERVICE_ACCOUNT (the service-account JSON) and VITE_FIREBASE_DATABASE_URL in the
// environment. An article module default-exports { id, categoryName, post } where `post` is a blog post
// (title, slug, excerpt, body as a doc object, author, tags, seo fields ...). Nothing is written unless every
// article passes validation. Re-running updates the same articles.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { normalizePost, validatePost } from '../src/utils/blog/post.js';
import { buildPublishWrites, blogPath } from '../src/utils/blog/writes.js';
import { slugFromTitle } from '../src/utils/blog/slug.js';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const files = args.filter((arg) => !arg.startsWith('--'));
if (files.length === 0) {
  console.error('Usage: node scripts/publish-blog-article.mjs <article.mjs>... [--apply]');
  process.exit(2);
}

const now = Date.now();

async function loadArticle(file) {
  const { default: article } = await import(pathToFileURL(path.resolve(file)).href);
  const categoryId = slugFromTitle(article.categoryName, '');
  const draft = normalizePost({ ...article.post, id: article.id, categoryId, body: JSON.stringify(article.post.body), status: 'published', createdAt: now, updatedAt: now });
  const { errors, warnings } = validatePost(draft, { forPublish: true });
  return { file, article, categoryId, draft, errors, warnings };
}

// 1. Validate everything first, so a mistake in one article stops the whole run before anything is written.
const loaded = await Promise.all(files.map(loadArticle));
let failed = false;
for (const { file, errors, warnings } of loaded) {
  warnings.filter((w) => w.field !== 'coverImage').forEach((w) => console.log(`${file}  warning  ${w.field}: ${w.message}`));
  errors.forEach((e) => {
    failed = true;
    console.error(`${file}  error    ${e.field}: ${e.message}`);
  });
}
const slugs = loaded.map((l) => l.draft.slug);
const ids = loaded.map((l) => l.draft.id);
if (new Set(slugs).size !== slugs.length || new Set(ids).size !== ids.length) {
  console.error('Two of the articles share a slug or an id.');
  failed = true;
}
if (failed) process.exit(1);

// 2. Connect (only when applying).
let db = null;
if (apply) {
  const { cert, getApps, initializeApp } = await import('firebase-admin/app');
  const { getDatabase } = await import('firebase-admin/database');
  if (!process.env.FIREBASE_SERVICE_ACCOUNT || !process.env.VITE_FIREBASE_DATABASE_URL) {
    console.error('--apply needs FIREBASE_SERVICE_ACCOUNT and VITE_FIREBASE_DATABASE_URL in the environment.');
    process.exit(2);
  }
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)), databaseURL: process.env.VITE_FIREBASE_DATABASE_URL });
  }
  db = getDatabase();
}
const read = (p) => db.ref(p).get().then((s) => s.val());

// 3. Work out every article's writes (reading the current state when applying), then write them.
const plans = [];
for (const { draft, article, categoryId } of loaded) {
  let existing = null;
  let redirects = {};
  if (apply) {
    const [claim, admin, redirectMap] = await Promise.all([read(blogPath('slugClaims', draft.slug)), read(blogPath('admin', draft.id)), read(blogPath('redirects'))]);
    if (claim && claim !== draft.id) {
      console.error(`The slug "${draft.slug}" already belongs to another article (${claim}). Nothing was written.`);
      process.exit(1);
    }
    existing = admin;
    redirects = redirectMap ?? {};
  }
  const post = normalizePost({ ...draft, createdAt: existing?.createdAt ?? now, publishedAt: existing?.publishedAt ?? now });
  const writes = buildPublishWrites({
    post,
    now,
    previousPublishedSlug: existing?.slug && existing.slug !== post.slug ? existing.slug : '',
    redirects,
  });
  writes[blogPath('slugClaims', post.slug)] = post.id;
  writes[blogPath('categories', categoryId)] = { name: article.categoryName, slug: categoryId };
  plans.push({ post, writes });
}

for (const { post, writes } of plans) {
  console.log(`${apply ? 'writing' : 'dry run:'} ${Object.keys(writes).length} paths for "${post.title}" -> /blogs/${post.slug}`);
}
if (!apply) {
  console.log('Nothing was written. Re-run with --apply to publish.');
  process.exit(0);
}

// One article per update so a failure never leaves a half-published article. Realtime Database rejects
// undefined; null deletes.
for (const { post, writes } of plans) {
  await db.ref().update(JSON.parse(JSON.stringify(writes, (_k, v) => (v === undefined ? null : v))));
  console.log(`Published: /blogs/${post.slug}`);
}
process.exit(0);
