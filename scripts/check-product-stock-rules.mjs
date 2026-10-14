// Behavioural check for the `adminProducts` node of database.rules.json: checkout
// (no admin claim) may adjust a single size's stock leaf within a bound and
// nothing else. Runs against the Firebase Realtime Database emulator JAR (no npm
// dependencies, no network, never touches a real project).
//
//   node scripts/check-product-stock-rules.mjs
//
// Same conventions as scripts/check-orders-rules.mjs: the JAR is the one the
// Firebase CLI caches after its first emulator run (RTDB_EMULATOR_JAR overrides),
// RULES_FILE checks a different rules file (point it at the pre-change rules to
// confirm the "allow" checks fail there), exit 1 on any failure and 2 (skipped)
// if the JAR or Java is unavailable. Requests carry unsigned test tokens, which
// the emulator accepts and a real project would reject.
//
// The bound (50) mirrors MAX_STOCK_DELTA in src/services/adminProducts.js.
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX = 50;

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
const NS = 'a2z-stock-rules-check';

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
  return { ok: res.ok, status: res.status };
}

// p1: colour 0 is tracked (S=10, M=3, L=100, XL untracked), colour 1 is a legacy
// string colour. p2 is a sibling product.
const product = (title) => ({
  id: title,
  title,
  price: 999,
  categoryId: 'cat_kurtas',
  colors: [
    {
      name: 'Red',
      hex: '#ff0000',
      outOfStock: false,
      sizes: [{ size: 'S', stock: 10 }, { size: 'M', stock: 3 }, { size: 'L', stock: 100 }, { size: 'XL' }],
    },
    'Legacy Blue',
  ],
});
const reseed = async () => {
  for (const id of ['p1', 'p2']) {
    const r = await call('PUT', `adminProducts/${id}`, 'owner', product(id));
    if (!r.ok) throw new Error(`seeding ${id} failed (HTTP ${r.status})`);
  }
};
const leaf = (id, ci, si) => `adminProducts/${id}/colors/${ci}/sizes/${si}/stock`;

let failures = 0;
let n = 0;
async function expect(label, allowed, fn) {
  n += 1;
  await reseed();
  const r = await fn();
  const pass = r.ok === allowed;
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}  (expected ${allowed ? 'allow' : 'deny'}, got HTTP ${r.status})`);
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
    await expect(`${who}: read a product`, true, () => call('GET', 'adminProducts/p1', who));

  console.log(`--- stock leaf: checkout writes (bound is ${MAX} per write)`);
  for (const who of ['anon', 'customer', 'admin']) {
    await expect(`${who}: decrement within bound (10 -> 7)`, true, () => call('PUT', leaf('p1', 0, 0), who, 7));
    await expect(`${who}: decrement to exactly zero (3 -> 0)`, true, () => call('PUT', leaf('p1', 0, 1), who, 0));
    await expect(`${who}: increase within bound (10 -> 15, a release)`, true, () => call('PUT', leaf('p1', 0, 0), who, 15));
    await expect(`${who}: decrement by exactly the bound (100 -> 50)`, true, () => call('PUT', leaf('p1', 0, 2), who, 100 - MAX));
    await expect(`${who}: sibling product, decrement within bound`, true, () => call('PUT', leaf('p2', 0, 0), who, 9));
  }
  for (const who of ['anon', 'customer']) {
    await expect(`${who}: decrement over bound (100 -> 49)`, false, () => call('PUT', leaf('p1', 0, 2), who, 100 - MAX - 1));
    await expect(`${who}: increase over bound (10 -> 61)`, false, () => call('PUT', leaf('p1', 0, 0), who, 10 + MAX + 1));
    await expect(`${who}: below zero (3 -> -1)`, false, () => call('PUT', leaf('p1', 0, 1), who, -1));
    await expect(`${who}: non-integer (10 -> 9.5)`, false, () => call('PUT', leaf('p1', 0, 0), who, 9.5));
    await expect(`${who}: string value`, false, () => call('PUT', leaf('p1', 0, 0), who, '9'));
    await expect(`${who}: boolean value`, false, () => call('PUT', leaf('p1', 0, 0), who, true));
    await expect(`${who}: object value`, false, () => call('PUT', leaf('p1', 0, 0), who, { a: 1 }));
    await expect(`${who}: delete the stock leaf`, false, () => call('DELETE', leaf('p1', 0, 0), who));
    await expect(`${who}: stock on an untracked size (does not exist yet)`, false, () => call('PUT', leaf('p1', 0, 3), who, 5));
    await expect(`${who}: stock on a size index that does not exist`, false, () => call('PUT', leaf('p1', 0, 9), who, 5));
    await expect(`${who}: stock on a legacy string colour`, false, () => call('PUT', leaf('p1', 1, 0), who, 5));
    await expect(`${who}: stock on a product that does not exist`, false, () => call('PUT', leaf('nope', 0, 0), who, 5));
  }
  await expect('admin: below zero (admin keeps full control)', true, () => call('PUT', leaf('p1', 0, 1), 'admin', -1));
  await expect('admin: jump over the bound (10 -> 500)', true, () => call('PUT', leaf('p1', 0, 0), 'admin', 500));

  console.log('--- everything else under adminProducts stays admin-only');
  const others = [
    ['price', 'adminProducts/p1/price', 'PUT', 1],
    ['title', 'adminProducts/p1/title', 'PUT', 'hacked'],
    ['colour name', 'adminProducts/p1/colors/0/name', 'PUT', 'Green'],
    ['colour outOfStock flag', 'adminProducts/p1/colors/0/outOfStock', 'PUT', true],
    ['size label', 'adminProducts/p1/colors/0/sizes/0/size', 'PUT', 'XS'],
    ['one size entry (stock inside, via parent)', 'adminProducts/p1/colors/0/sizes/0', 'PUT', { size: 'S', stock: 9 }],
    ['the whole sizes array', 'adminProducts/p1/colors/0/sizes', 'PUT', [{ size: 'S', stock: 9 }]],
    ['the whole colors array', 'adminProducts/p1/colors', 'PUT', product('p1').colors],
    ['the whole product', 'adminProducts/p1', 'PUT', product('p1')],
    ['a new product', 'adminProducts/p3', 'PUT', product('p3')],
    ['the whole adminProducts node', 'adminProducts', 'PUT', {}],
    ['delete the product', 'adminProducts/p1', 'DELETE'],
    ['delete the sibling product', 'adminProducts/p2', 'DELETE'],
  ];
  for (const who of ['anon', 'customer'])
    for (const [label, path, method, body] of others)
      await expect(`${who}: write ${label}`, false, () => call(method, path, who, body));
  for (const [label, path, method, body] of others.filter(([l]) => ['price', 'the whole colors array', 'a new product'].includes(l)))
    await expect(`admin: write ${label}`, true, () => call(method, path, 'admin', body));

  console.log('--- multi-path updates');
  await expect('customer: PATCH root with only in-bound stock leaves', true, () =>
    call('PATCH', 'adminProducts', 'customer', { [`p1/colors/0/sizes/0/stock`]: 8, [`p2/colors/0/sizes/0/stock`]: 8 }));
  await expect('customer: PATCH root mixing a stock leaf and a price', false, () =>
    call('PATCH', 'adminProducts', 'customer', { [`p1/colors/0/sizes/0/stock`]: 8, 'p1/price': 1 }));
  await expect('customer: PATCH root with one out-of-bound leaf', false, () =>
    call('PATCH', 'adminProducts', 'customer', { [`p1/colors/0/sizes/0/stock`]: 8, [`p1/colors/0/sizes/2/stock`]: 1 }));

  console.log('--- other nodes are unaffected');
  for (const path of ['trashedProducts/p1', 'categories/c1', 'settings/x'])
    await expect(`customer: write ${path}`, false, () => call('PUT', path, 'customer', { a: 1 }));

  console.log(`\n${n - failures}/${n} checks passed`);
} catch (err) {
  failures += 1;
  console.error('ERROR:', err.message);
} finally {
  stop();
}
process.exit(failures ? 1 : 0);
