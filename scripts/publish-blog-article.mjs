// Publishes a blog article straight to the Realtime Database with the Admin SDK, using the same validation and
// multi-path write the editor and the scheduled function use (src/utils/blog).
//
//   node scripts/publish-blog-article.mjs <article.mjs>            dry run: validates and lists the writes
//   node scripts/publish-blog-article.mjs <article.mjs> --apply    writes to the database
//
// --apply needs FIREBASE_SERVICE_ACCOUNT (the service-account JSON) and VITE_FIREBASE_DATABASE_URL in the
// environment. The article module default-exports { id, categoryName, post } where `post` is a blog post
// (title, slug, excerpt, body as a doc object, author, tags, seo fields ...). Re-running updates the same article.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { normalizePost, validatePost } from '../src/utils/blog/post.js';
import { buildPublishWrites, blogPath } from '../src/utils/blog/writes.js';
import { slugFromTitle } from '../src/utils/blog/slug.js';

const [file, ...flags] = process.argv.slice(2);
const apply = flags.includes('--apply');
if (!file) {
  console.error('Usage: node scripts/publish-blog-article.mjs <article.mjs> [--apply]');
  process.exit(2);
}

const { default: article } = await import(pathToFileURL(path.resolve(file)).href);
const now = Date.now();
const categoryId = slugFromTitle(article.categoryName, '');
const draft = normalizePost({ ...article.post, id: article.id, categoryId, body: JSON.stringify(article.post.body), status: 'published', createdAt: now, updatedAt: now });

const { errors, warnings } = validatePost(draft, { forPublish: true });
warnings.forEach((w) => console.log(`warning  ${w.field}: ${w.message}`));
if (errors.length) {
  errors.forEach((e) => console.error(`error    ${e.field}: ${e.message}`));
  process.exit(1);
}

let db = null;
let existing = null;
let redirects = {};
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
  const read = (p) => db.ref(p).get().then((s) => s.val());
  const [claim, admin, redirectMap] = await Promise.all([read(blogPath('slugClaims', draft.slug)), read(blogPath('admin', draft.id)), read(blogPath('redirects'))]);
  if (claim && claim !== draft.id) {
    console.error(`The slug "${draft.slug}" already belongs to another article (${claim}). Nothing was written.`);
    process.exit(1);
  }
  existing = admin;
  redirects = redirectMap ?? {};
}

const post = normalizePost({
  ...draft,
  createdAt: existing?.createdAt ?? now,
  publishedAt: existing?.publishedAt ?? now,
});
const writes = buildPublishWrites({
  post,
  now,
  previousPublishedSlug: existing?.slug && existing.slug !== post.slug ? existing.slug : '',
  redirects,
});
writes[blogPath('slugClaims', post.slug)] = post.id;
writes[blogPath('categories', categoryId)] = { name: article.categoryName, slug: categoryId };

console.log(`${apply ? 'writing' : 'dry run:'} ${Object.keys(writes).length} paths for "${post.title}" -> /blogs/${post.slug}`);
Object.keys(writes).forEach((key) => console.log(`  ${key}`));
if (!apply) {
  console.log('Nothing was written. Re-run with --apply to publish.');
  process.exit(0);
}

// Realtime Database rejects undefined; null deletes.
await db.ref().update(JSON.parse(JSON.stringify(writes, (_k, v) => (v === undefined ? null : v))));
console.log(`Published: /blogs/${post.slug}`);
process.exit(0);
