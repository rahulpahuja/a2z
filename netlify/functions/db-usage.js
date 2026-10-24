// Measures how much data the Realtime Database holds, for Super User > Usage & Billing.
//
// Firebase does not expose "bytes stored" through the client or Admin SDK, so this reads each top-level
// node and adds up the size of its JSON (keys included). That is a close estimate of what the plan limit
// counts, not Firebase's own meter: the Firebase console figure can differ a little (indexes, encoding).
//
// Only a signed-in admin (Firebase ID token carrying the `admin` claim) may call it. The result is kept
// for a few minutes per warm function instance because every measurement downloads the whole database.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

// The Spark plan stores 1 GB (decimal), and the free-plan figures are quoted in decimal units.
export const STORAGE_LIMIT_BYTES = 1_000_000_000;
const CACHE_MS = 10 * 60 * 1000;
const DEADLINE_MS = 20 * 1000;
const CONCURRENCY = 4;

let cache = null;

export const jsonBytes = (value) => Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8');

// Adds up every top-level node. `listKeys()` returns the top-level key names, `readNode(key)` the value under
// one. Stops starting new reads once the deadline passes and reports the nodes it skipped, so a very large
// database yields a partial (lower-bound) figure rather than a timeout.
export async function measureDatabase({ listKeys, readNode, now = Date.now, deadlineMs = DEADLINE_MS, concurrency = CONCURRENCY }) {
  const started = now();
  const keys = [...(await listKeys())];
  const nodes = [];
  const skipped = [];
  let next = 0;

  async function worker() {
    while (next < keys.length) {
      const key = keys[next];
      next += 1;
      if (now() - started > deadlineMs) {
        skipped.push(key);
        continue;
      }
      const value = await readNode(key);
      nodes.push({ name: key, bytes: value === null || value === undefined ? 0 : jsonBytes(value) + Buffer.byteLength(key, 'utf8') });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, keys.length) }, worker));

  nodes.sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name));
  return {
    totalBytes: nodes.reduce((sum, n) => sum + n.bytes, 0),
    limitBytes: STORAGE_LIMIT_BYTES,
    nodes,
    partial: skipped.length > 0,
    skipped: skipped.sort(),
  };
}

function getFirebase() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)), databaseURL: process.env.VITE_FIREBASE_DATABASE_URL });
  }
  return { auth: getAuth(), db: getDatabase(), app: getApps()[0] };
}

// Top-level key names without downloading their contents (REST `shallow`).
async function listTopLevelKeys(app) {
  const { access_token: accessToken } = await app.options.credential.getAccessToken();
  const base = String(process.env.VITE_FIREBASE_DATABASE_URL).replace(/\/$/, '');
  const response = await fetch(`${base}/.json?shallow=true`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Could not list the database (${response.status}).`);
  return Object.keys((await response.json()) ?? {});
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const match = /^Bearer (.+)$/.exec(event.headers?.authorization ?? event.headers?.Authorization ?? '');
  if (!match) return json(401, { error: 'Sign in as an admin first.' });

  let firebase;
  try {
    firebase = getFirebase();
  } catch (error) {
    console.error('db-usage: Firebase is not configured', error?.message);
    return json(503, { error: 'The server is not configured for database usage.' });
  }

  let claims;
  try {
    claims = await firebase.auth.verifyIdToken(match[1]);
  } catch {
    return json(401, { error: 'Your sign-in has expired. Sign in again.' });
  }
  if (claims.admin !== true) return json(403, { error: 'Admins only.' });

  const refresh = event.queryStringParameters?.refresh === '1';
  if (!refresh && cache && Date.now() - cache.measuredAt < CACHE_MS) return json(200, { ...cache, cached: true });

  try {
    const result = await measureDatabase({
      listKeys: () => listTopLevelKeys(firebase.app),
      readNode: (key) => firebase.db.ref(key).get().then((snapshot) => snapshot.val()),
    });
    cache = { ...result, measuredAt: Date.now() };
    return json(200, { ...cache, cached: false });
  } catch (error) {
    console.error('db-usage: measurement failed', error?.message);
    return json(500, { error: 'Could not measure the database.' });
  }
};
