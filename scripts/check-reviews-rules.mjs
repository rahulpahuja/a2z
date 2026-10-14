// Behavioural check for the `productReviews` node of database.rules.json: anyone may
// post a new valid review and bump "helpful" by one, but only an admin may overwrite
// or delete an existing review. Customers will hold a Firebase identity once customer
// sign-in is on, so `auth != null` must not be enough to edit someone else's review.
// Runs against the Firebase Realtime Database emulator JAR (no npm dependencies, no
// network, never touches a real project).
//
//   node scripts/check-reviews-rules.mjs
//
// Same conventions as scripts/check-orders-rules.mjs: the JAR is the one the
// Firebase CLI caches after its first emulator run (RTDB_EMULATOR_JAR overrides),
// RULES_FILE checks a different rules file (point it at the pre-change rules to
// confirm the "allow" checks fail there), exit 1 on any failure and 2 (skipped)
// if the JAR or Java is unavailable. Requests carry unsigned test tokens, which
// the emulator accepts and a real project would reject.
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function findJar() {
  if (process.env.RTDB_EMULATOR_JAR) return process.env.RTDB_EMULATOR_JAR;
  const dir = join(homedir(), '.cache', 'firebase', 'emulators');
  if (!existsSync(dir)) return null;
  const name = readdirSync(dir).find((n) => /^firebase-database-emulator-.*\.jar$/.test(n));
  return name ? join(dir, name) : null;
}

const jar = findJar();
if (!jar || !existsSync(jar)) {
  console.log('SKIPPED: Realtime Database emulator JAR not found (set RTDB_EMULATOR_JAR).');
  process.exit(2);
}

const PORT = 9000 + Math.floor(Math.random() * 900);
const BASE = `http://127.0.0.1:${PORT}`;
const NS = 'a2z-reviews-rules-check';

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const token = (claims) => `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ iat: 1, sub: claims.uid, user_id: claims.uid, ...claims })}.`;
const WHO = {
  anon: null,
  customer: token({ uid: 'customer-1' }),
  admin: token({ uid: 'msg91:919999999999', admin: true }),
};

async function call(method, path, who, body) {
  const [pathname, query = ''] = path.split('?');
  const url = new URL(`${BASE}/${pathname}.json?${query}`);
  url.searchParams.set('ns', NS);
  const headers = { 'Content-Type': 'application/json' };
  if (who === 'owner') headers.Authorization = 'Bearer owner';
  else if (WHO[who]) url.searchParams.set('auth', WHO[who]);
  const init = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(url, init);
  return { ok: res.ok, status: res.status, text: res.ok ? '' : await res.text() };
}

const review = (extra = {}) => ({
  name: 'Asha',
  rating: 5,
  title: 'Lovely',
  body: 'Fits well and the fabric feels great.',
  helpful: 0,
  createdAtMs: 1700000000000,
  ...extra,
});
const reseed = async () => {
  await call('DELETE', 'productReviews', 'owner');
  const r = await call('PUT', 'productReviews/p1/r1', 'owner', review({ helpful: 3 }));
  if (!r.ok) throw new Error(`seeding failed (HTTP ${r.status})`);
};

let failures = 0;
let n = 0;
async function expect(label, allowed, fn) {
  n += 1;
  await reseed();
  const r = await fn();
  const pass = r.ok === allowed;
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}  (expected ${allowed ? 'allow' : 'deny'}, got HTTP ${r.status})${pass ? '' : ' ' + r.text.replace(/\s+/g, ' ').slice(0, 160)}`);
}

const proc = spawn('java', ['-jar', jar, '--host', '127.0.0.1', '--port', String(PORT)], { stdio: 'ignore' });
proc.on('error', (err) => {
  console.log(`SKIPPED: could not start java (${err.message}).`);
  process.exit(2);
});
const stop = () => proc.kill('SIGKILL');
process.on('exit', stop);

try {
  for (let i = 0; i < 60; i += 1) {
    try {
      await fetch(BASE);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  const rules = readFileSync(process.env.RULES_FILE || join(root, 'database.rules.json'), 'utf8');
  const put = await fetch(`${BASE}/.settings/rules.json?ns=${NS}`, {
    method: 'PUT',
    headers: { Authorization: 'Bearer owner' },
    body: rules,
  });
  if (!put.ok) throw new Error(`Emulator rejected database.rules.json (HTTP ${put.status}): ${await put.text()}`);

  console.log('--- reads stay public');
  for (const who of ['anon', 'customer', 'admin'])
    await expect(`${who}: read reviews`, true, () => call('GET', 'productReviews/p1', who));

  console.log('--- posting a new review');
  for (const who of ['anon', 'customer', 'admin'])
    await expect(`${who}: create a valid review`, true, () => call('PUT', 'productReviews/p1/r2', who, review()));
  for (const who of ['anon', 'customer']) {
    await expect(`${who}: create with rating 6`, false, () => call('PUT', 'productReviews/p1/r2', who, review({ rating: 6 })));
    await expect(`${who}: create with a too-short body`, false, () => call('PUT', 'productReviews/p1/r2', who, review({ body: 'short' })));
    await expect(`${who}: create with an unknown field`, false, () => call('PUT', 'productReviews/p1/r2', who, review({ isAdmin: true })));
  }

  console.log('--- changing or deleting an existing review (admin only)');
  for (const who of ['anon', 'customer']) {
    await expect(`${who}: overwrite an existing review`, false, () => call('PUT', 'productReviews/p1/r1', who, review({ body: 'Replaced by someone else', helpful: 3 })));
    await expect(`${who}: delete an existing review`, false, () => call('DELETE', 'productReviews/p1/r1', who));
    await expect(`${who}: delete every review of a product`, false, () => call('DELETE', 'productReviews/p1', who));
    await expect(`${who}: delete all reviews`, false, () => call('DELETE', 'productReviews', who));
    await expect(`${who}: edit a review's rating in place`, false, () => call('PUT', 'productReviews/p1/r1/rating', who, 1));
  }
  await expect('admin: overwrite an existing review', true, () => call('PUT', 'productReviews/p1/r1/body', 'admin', 'Edited by the shop admin team.'));
  await expect('admin: delete an existing review', true, () => call('DELETE', 'productReviews/p1/r1', 'admin'));

  console.log('--- helpful votes (+1 only)');
  for (const who of ['anon', 'customer']) {
    await expect(`${who}: helpful 3 -> 4`, true, () => call('PUT', 'productReviews/p1/r1/helpful', who, 4));
    await expect(`${who}: helpful 3 -> 999`, false, () => call('PUT', 'productReviews/p1/r1/helpful', who, 999));
    await expect(`${who}: helpful 3 -> 2`, false, () => call('PUT', 'productReviews/p1/r1/helpful', who, 2));
  }

  console.log(`\n${n - failures}/${n} checks passed`);
} catch (err) {
  failures += 1;
  console.error('ERROR:', err.message);
} finally {
  stop();
}
process.exit(failures ? 1 : 0);
