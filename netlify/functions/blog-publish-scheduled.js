// Publishes scheduled blog articles when their time arrives. Runs on Netlify's scheduler, so it does not
// depend on anyone's browser being open.
//
// It reuses the same pure publish logic as the admin editor (src/utils/blog/writes.js), applied with the
// Admin SDK so it bypasses database rules; an article is only published if it still passes the same checks
// the editor enforces. One broken article never blocks the others.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { normalizePost, validatePost } from '../../src/utils/blog/post.js';
import { buildPublishWrites, selectDuePosts } from '../../src/utils/blog/writes.js';

export const config = { schedule: '*/10 * * * *' };

function getDb() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)), databaseURL: process.env.VITE_FIREBASE_DATABASE_URL });
  }
  return getDatabase();
}

// Publishes every due article. Returns { published: [ids], skipped: [{ id, reason }] }.
export async function publishDuePosts(db, now = Date.now()) {
  const snapshot = await db.ref('blogs/admin').orderByChild('status').equalTo('scheduled').get();
  const scheduled = Object.entries(snapshot.val() ?? {}).map(([id, post]) => normalizePost({ ...post, id }));
  const published = [];
  const skipped = [];

  for (const post of selectDuePosts(scheduled, now)) {
    try {
      const problems = validatePost(post, { forPublish: true }).errors;
      if (problems.length) {
        skipped.push({ id: post.id, reason: problems[0].message });
        continue;
      }
      const [livePublic, redirects] = await Promise.all([
        db.ref(`blogs/public/${post.id}`).get().then((s) => s.val()),
        db.ref('blogs/redirects').get().then((s) => s.val() ?? {}),
      ]);
      const writes = buildPublishWrites({
        post: { ...post, status: 'published', publishedAt: post.publishAt },
        now,
        previousPublishedSlug: livePublic?.slug && livePublic.slug !== post.slug ? livePublic.slug : '',
        redirects,
      });
      // Realtime Database rejects undefined; null deletes.
      await db.ref().update(JSON.parse(JSON.stringify(writes, (_k, v) => (v === undefined ? null : v))));
      published.push(post.id);
    } catch (error) {
      console.error('blog-publish-scheduled: could not publish', post.id, error?.message);
      skipped.push({ id: post.id, reason: 'error' });
    }
  }
  return { published, skipped };
}

export default async function handler() {
  const result = await publishDuePosts(getDb());
  console.log('blog-publish-scheduled', JSON.stringify({ published: result.published.length, skipped: result.skipped.length }));
  return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
