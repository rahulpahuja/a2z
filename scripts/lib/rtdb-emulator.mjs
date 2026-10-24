// Shared helpers for the rules checks (scripts/check-*-rules.mjs): start the Realtime Database
// emulator JAR the Firebase CLI caches, load database.rules.json, and issue REST calls as
// different callers. Never touches a real project; unsigned test tokens only work on the emulator.
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function findJar() {
  if (process.env.RTDB_EMULATOR_JAR) return process.env.RTDB_EMULATOR_JAR;
  const dir = join(homedir(), '.cache', 'firebase', 'emulators');
  if (!existsSync(dir)) return null;
  const name = readdirSync(dir).find((n) => /^firebase-database-emulator-.*\.jar$/.test(n));
  return name ? join(dir, name) : null;
}

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
export const token = (claims) => `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ iat: 1, sub: claims.uid, user_id: claims.uid, ...claims })}.`;

export const WHO = {
  anon: null,
  customer: token({ uid: 'customer-1' }),
  admin: token({ uid: 'msg91:919999999999', admin: true }),
};

// Starts the emulator with the rules loaded and returns { call, expect, summary, stop }.
// Exits with status 2 (skipped) when Java or the JAR is missing.
export async function startEmulator({ ns, rulesFile = process.env.RULES_FILE || join(root, 'database.rules.json') }) {
  const jar = findJar();
  if (!jar || !existsSync(jar)) {
    console.log('SKIPPED: Realtime Database emulator JAR not found (set RTDB_EMULATOR_JAR).');
    process.exit(2);
  }
  const port = 9000 + Math.floor(Math.random() * 900);
  const base = `http://127.0.0.1:${port}`;
  const proc = spawn('java', ['-jar', jar, '--host', '127.0.0.1', '--port', String(port)], { stdio: 'ignore' });
  proc.on('error', (err) => {
    console.log(`SKIPPED: could not start java (${err.message}).`);
    process.exit(2);
  });
  const stop = () => proc.kill('SIGKILL');
  process.on('exit', stop);

  for (let i = 0; i < 60; i += 1) {
    try {
      await fetch(base);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  const put = await fetch(`${base}/.settings/rules.json?ns=${ns}`, {
    method: 'PUT',
    headers: { Authorization: 'Bearer owner' },
    body: readFileSync(rulesFile, 'utf8'),
  });
  if (!put.ok) throw new Error(`Emulator rejected the rules (HTTP ${put.status}): ${await put.text()}`);

  async function call(method, path, who, body) {
    const [pathname, query = ''] = path.split('?');
    const url = new URL(`${base}/${pathname}.json?${query}`);
    url.searchParams.set('ns', ns);
    const headers = { 'Content-Type': 'application/json' };
    if (who === 'owner') headers.Authorization = 'Bearer owner';
    else if (WHO[who]) url.searchParams.set('auth', WHO[who]);
    const init = { method, headers };
    if (body !== undefined) init.body = JSON.stringify(body);
    const res = await fetch(url, init);
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  }

  let failures = 0;
  let total = 0;
  async function expect(label, allowed, fn) {
    total += 1;
    const r = await fn();
    const pass = r.ok === allowed;
    if (!pass) failures += 1;
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}  (expected ${allowed ? 'allow' : 'deny'}, got HTTP ${r.status})`);
  }
  const summary = () => {
    console.log(`\n${total - failures}/${total} checks passed`);
    stop();
    process.exit(failures ? 1 : 0);
  };
  return { call, expect, summary, stop };
}
