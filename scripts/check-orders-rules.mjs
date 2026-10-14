// Behavioural check for the `orders` node of database.rules.json, run against
// the Firebase Realtime Database emulator JAR (no npm dependencies, no network,
// never touches a real project).
//
//   node scripts/check-orders-rules.mjs
//
// The JAR is the one the Firebase CLI caches after its first emulator run. Point
// RTDB_EMULATOR_JAR at it if it lives somewhere else; RULES_FILE checks a different
// rules file (e.g. to confirm the checks fail against the old rules). Exits 1 on any failure and
// 2 (skipped) if the JAR or Java is unavailable. Requests carry unsigned test
// tokens, which the emulator accepts and a real project would reject.
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
const NS = 'a2z-orders-rules-check';

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const token = (claims) => `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ iat: 1, sub: claims.uid, user_id: claims.uid, ...claims })}.`;
const UID_A = `c_${'A'.repeat(32)}`;
const UID_B = `c_${'B'.repeat(32)}`;
const WHO = {
  anon: null,
  customer: token({ uid: 'customer-1' }),
  custA: token({ uid: UID_A, customer: true }),
  custB: token({ uid: UID_B, customer: true }),
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
  return { ok: res.ok, status: res.status, text: res.ok ? await res.text() : '' };
}

const order = (id, extra = {}) => ({
  id,
  items: [{ id: 'p1-red-M', productId: 'p1', title: 'Kurta', color: 'red', size: 'M', price: 999, quantity: 1 }],
  subtotal: 999,
  couponCode: null,
  discount: 0,
  tax: 50,
  total: 1049,
  paymentMethod: 'Razorpay',
  paymentId: 'pay_x',
  placedAt: '2026-01-01T00:00:00.000Z',
  shippingDetails: { firstName: 'Test', lastName: 'User', phone: '9876543210', city: 'X', state: 'MH', zip: '400001', address: 'A', apartment: '', gstNumber: '', referredBy: '' },
  status: 'Processing',
  customerId: null,
  ...extra,
});
// Same JSON round trip createFirebaseOrder() does: drops null/undefined keys.
const clean = (o) => JSON.parse(JSON.stringify(o), (_k, v) => (v === null ? undefined : v));
const SHIP_OK = { status: 'created', awb: 'AWB1', courier: 'C', labelUrl: 'https://labels.example/1.pdf', cost: 55.5, createdAt: '2026-01-01T00:00:00.000Z' };

let failures = 0;
let n = 0;
async function expect(label, allowed, fn) {
  n += 1;
  const r = await fn();
  const pass = r.ok === allowed;
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}  (expected ${allowed ? 'allow' : 'deny'}, got HTTP ${r.status})`);
}
const seed = async (id, data = order(id)) => {
  const r = await call('PUT', `orders/${id}`, 'owner', clean(data));
  if (!r.ok) throw new Error(`seeding ${id} failed (HTTP ${r.status})`);
};

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

  await seed('ORD-SEEDED0001');

  console.log('--- reads');
  for (const who of ['anon', 'customer']) await expect(`${who}: list all orders`, false, () => call('GET', 'orders', who));
  await expect('admin: list all orders', true, () => call('GET', 'orders', 'admin'));
  await expect('anon: shallow id enumeration', false, () => call('GET', 'orders?shallow=true', 'anon'));
  await expect('customer: shallow id enumeration', false, () => call('GET', 'orders?shallow=true', 'customer'));
  for (const who of ['anon', 'customer', 'admin'])
    await expect(`${who}: read one order by id (tracking)`, true, () => call('GET', 'orders/ORD-SEEDED0001', who));

  console.log('--- create (guest checkout)');
  let i = 0;
  const fresh = () => `ORD-NEW${String((i += 1)).padStart(6, '0')}`;
  for (const who of ['anon', 'customer', 'admin']) {
    const id = fresh();
    await expect(`${who}: create valid order`, true, () => call('PUT', `orders/${id}`, who, clean(order(id))));
  }
  const bad = [
    ['status Delivered', (id) => order(id, { status: 'Delivered' })],
    ['status Completed', (id) => order(id, { status: 'Completed' })],
    ['admin-only key trackingId', (id) => order(id, { trackingId: 'T1' })],
    ['admin-only key source', (id) => order(id, { source: 'in-store' })],
    ['unknown key junk', (id) => order(id, { junk: 'x' })],
    ['missing shippingDetails', (id) => { const o = order(id); delete o.shippingDetails; return o; }],
    ['missing items', (id) => { const o = order(id); delete o.items; return o; }],
    ['id does not match key', () => order('ORD-SOMETHINGELSE')],
    ['negative total', (id) => order(id, { total: -5 })],
    ['string total', (id) => order(id, { total: '10' })],
    ['huge total', (id) => order(id, { total: 1e9 })],
    ['oversized shipping field', (id) => order(id, { shippingDetails: { firstName: 'x'.repeat(400), phone: '1' } })],
    ['embedded shipment at create', (id) => order(id, { shipment: SHIP_OK })],
  ];
  for (const [label, build] of bad) {
    const id = fresh();
    await expect(`anon: create rejected - ${label}`, false, () => call('PUT', `orders/${id}`, 'anon', clean(build(id))));
  }
  await expect('anon: create with too-short id', false, () => call('PUT', 'orders/ab', 'anon', clean(order('ab'))));

  console.log('--- overwrite / update / delete of an existing order');
  for (const who of ['anon', 'customer']) {
    await expect(`${who}: overwrite existing order`, false, () => call('PUT', 'orders/ORD-SEEDED0001', who, clean(order('ORD-SEEDED0001', { total: 1 }))));
    await expect(`${who}: patch existing order`, false, () => call('PATCH', 'orders/ORD-SEEDED0001', who, { status: 'Delivered' }));
    await expect(`${who}: set status child`, false, () => call('PUT', 'orders/ORD-SEEDED0001/status', who, 'Delivered'));
    await expect(`${who}: set total child`, false, () => call('PUT', 'orders/ORD-SEEDED0001/total', who, 1));
    await expect(`${who}: delete existing order`, false, () => call('DELETE', 'orders/ORD-SEEDED0001', who));
  }
  await expect('anon: bulk write via orders root replacing an existing order', false, () =>
    call('PATCH', 'orders', 'anon', { 'ORD-SEEDED0001': clean(order('ORD-SEEDED0001', { total: 1 })) }));
  await expect('anon: bulk write via orders root creating only new orders', true, () =>
    call('PATCH', 'orders', 'anon', { 'ORD-ROOTWRITE1': clean(order('ORD-ROOTWRITE1')) }));
  await expect('admin: overwrite existing order with tracking', true, () =>
    call('PUT', 'orders/ORD-SEEDED0001', 'admin', clean(order('ORD-SEEDED0001', { status: 'Shipped', trackingId: 'T1', trackingPartner: 'P' }))));
  await expect('admin: in-store bill (Completed, source, gst, timestamps)', true, () =>
    call('PUT', 'orders/BILL-ABC123', 'admin', clean(order('BILL-ABC123', { status: 'Completed', source: 'in-store', gstApplied: true, createdAt: 1, updatedAt: 2 }))));
  await expect('admin: delete order', true, () => call('DELETE', 'orders/BILL-ABC123', 'admin'));

  console.log('--- shipment write-once from the checkout browser');
  await seed('ORD-SHIP0000001');
  await expect('anon: shipment on missing order', false, () => call('PUT', 'orders/ORD-NOSUCH00001/shipment', 'anon', SHIP_OK));
  await expect('anon: shipment with javascript: labelUrl', false, () => call('PUT', 'orders/ORD-SHIP0000001/shipment', 'anon', { ...SHIP_OK, labelUrl: 'javascript:alert(1)' }));
  await expect('anon: shipment with extra key', false, () => call('PUT', 'orders/ORD-SHIP0000001/shipment', 'anon', { ...SHIP_OK, history: [1] }));
  await expect('anon: shipment with unknown status', false, () => call('PUT', 'orders/ORD-SHIP0000001/shipment', 'anon', { ...SHIP_OK, status: 'delivered' }));
  await expect('anon: shipment without status', false, () => call('PUT', 'orders/ORD-SHIP0000001/shipment', 'anon', { awb: 'x' }));
  await expect('anon: first shipment write (created)', true, () => call('PUT', 'orders/ORD-SHIP0000001/shipment', 'anon', SHIP_OK));
  await expect('anon: second shipment write', false, () => call('PUT', 'orders/ORD-SHIP0000001/shipment', 'anon', { status: 'failed', error: 'x' }));
  await expect('anon: shipment delete', false, () => call('DELETE', 'orders/ORD-SHIP0000001/shipment', 'anon'));
  await seed('ORD-SHIP0000002');
  await expect('customer: first shipment write (failed)', true, () => call('PUT', 'orders/ORD-SHIP0000002/shipment', 'customer', { status: 'failed', error: 'ShipPrime down' }));
  await expect('admin: overwrite shipment with tracking history', true, () =>
    call('PUT', 'orders/ORD-SHIP0000001/shipment', 'admin', { ...SHIP_OK, currentStatus: 'In Transit', history: [{ s: 'x', at: 1 }], lastTrackedAt: 'now' }));
  await expect('admin: cancel shipment', true, () => call('PUT', 'orders/ORD-SHIP0000001/shipment/status', 'admin', 'cancelled'));

  console.log('--- customer identity: owner queries and ownerUid');
  await seed('ORD-OWNED00001A', order('ORD-OWNED00001A', { ownerUid: UID_A }));
  await seed('ORD-OWNED00002A', order('ORD-OWNED00002A', { ownerUid: UID_A }));
  await seed('ORD-OWNED00001B', order('ORD-OWNED00001B', { ownerUid: UID_B }));
  const byOwner = (uid, child = 'ownerUid') => `orders?orderBy="${child}"&equalTo="${uid}"`;
  const ids = (r) => Object.keys(JSON.parse(r.text || 'null') || {}).sort().join(',');
  await expect('anon: query by ownerUid A', false, () => call('GET', byOwner(UID_A), 'anon'));
  await expect('customer A: query own ownerUid', true, () => call('GET', byOwner(UID_A), 'custA'));
  await expect('customer A: own query returns exactly their orders', true, async () => {
    const r = await call('GET', byOwner(UID_A), 'custA');
    return { ...r, ok: r.ok && ids(r) === 'ORD-OWNED00001A,ORD-OWNED00002A' };
  });
  await expect("customer A: query B's ownerUid", false, () => call('GET', byOwner(UID_B), 'custA'));
  await expect('customer A: unconstrained list', false, () => call('GET', 'orders', 'custA'));
  await expect('customer A: shallow enumeration', false, () => call('GET', 'orders?shallow=true', 'custA'));
  await expect('customer A: orderBy ownerUid without equalTo', false, () => call('GET', 'orders?orderBy="ownerUid"', 'custA'));
  await expect('customer A: orderBy ownerUid with startAt only', false, () => call('GET', `orders?orderBy="ownerUid"&startAt="${UID_A}"`, 'custA'));
  await expect('customer A: equalTo own uid on a different child', false, () => call('GET', byOwner(UID_A, 'customerId'), 'custA'));
  await expect('customer B: query own ownerUid', true, () => call('GET', byOwner(UID_B), 'custB'));
  await expect("customer B: query A's ownerUid", false, () => call('GET', byOwner(UID_A), 'custB'));
  await expect('customer A: read one order by id (tracking), own', true, () => call('GET', 'orders/ORD-OWNED00001A', 'custA'));
  await expect('anon: read one order by id (tracking), owned', true, () => call('GET', 'orders/ORD-OWNED00001A', 'anon'));
  await expect('admin: list all orders incl. owned', true, () => call('GET', 'orders', 'admin'));
  await expect('admin: query by ownerUid', true, () => call('GET', byOwner(UID_A), 'admin'));

  console.log('--- customer identity: creating orders with ownerUid');
  const ownerCases = [
    ['anon: create with ownerUid', 'anon', UID_A, false],
    ['anon: create without ownerUid', 'anon', undefined, true],
    ['customer A: create with own ownerUid', 'custA', UID_A, true],
    ['customer A: create without ownerUid', 'custA', undefined, true],
    ["customer A: create with B's ownerUid", 'custA', UID_B, false],
    ['customer A: create with non-string ownerUid', 'custA', 12345, false],
    ['customer A: create with empty ownerUid', 'custA', '', false],
    ['admin: create with any ownerUid', 'admin', UID_B, true],
  ];
  for (const [label, who, ownerUid, allowed] of ownerCases) {
    const id = fresh();
    await expect(label, allowed, () => call('PUT', `orders/${id}`, who, clean(order(id, ownerUid === undefined ? {} : { ownerUid }))));
  }

  console.log('--- customer identity: ownerUid is immutable');
  await seed('ORD-LEGACY00001');
  const guard = [
    ['customer A: re-assign own order to B', () => call('PUT', 'orders/ORD-OWNED00001A/ownerUid', 'custA', UID_B)],
    ['customer A: patch own order ownerUid', () => call('PATCH', 'orders/ORD-OWNED00001A', 'custA', { ownerUid: UID_A })],
    ['customer A: delete ownerUid on own order', () => call('DELETE', 'orders/ORD-OWNED00001A/ownerUid', 'custA')],
    ["customer A: take over B's order", () => call('PUT', 'orders/ORD-OWNED00001B/ownerUid', 'custA', UID_A)],
    ['customer A: claim a legacy order', () => call('PUT', 'orders/ORD-LEGACY00001/ownerUid', 'custA', UID_A)],
    ['anon: claim a legacy order', () => call('PUT', 'orders/ORD-LEGACY00001/ownerUid', 'anon', UID_A)],
    ['customer A: overwrite own order', () => call('PUT', 'orders/ORD-OWNED00001A', 'custA', clean(order('ORD-OWNED00001A', { ownerUid: UID_A, total: 1 })))],
  ];
  for (const [label, fn] of guard) await expect(label, false, fn);
  await expect('admin: change ownerUid', true, () => call('PUT', 'orders/ORD-OWNED00001B/ownerUid', 'admin', UID_A));

  console.log(`\n${n - failures}/${n} checks passed`);
} catch (err) {
  failures += 1;
  console.error('ERROR:', err.message);
} finally {
  stop();
}
process.exit(failures ? 1 : 0);
