// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const createCustomToken = vi.fn(async (uid, claims) => `token:${uid}:${JSON.stringify(claims)}`);
vi.mock('firebase-admin/app', () => ({ cert: (x) => x, getApps: () => [{}], initializeApp: () => {} }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ createCustomToken }) }));

const { handler, deriveCustomerUid } = await import('../functions/exchange-token.js');

const SECRET = 'test-secret-value-1234567890';
const ADMIN = '919999999999';
const CUSTOMER = '919876543210';

const post = (body, ip) => ({
  httpMethod: 'POST',
  headers: { 'x-nf-client-connection-ip': ip },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

// MSG91 verification result; null simulates a rejected token.
const verifyReturns = (message) => {
  global.fetch = vi.fn(async () => ({
    ok: message !== null,
    status: message !== null ? 200 : 401,
    text: async () => JSON.stringify(message !== null ? { type: 'success', message } : { type: 'error', message: 'invalid' }),
  }));
};

// Each test uses its own client address so the per-address throttle never leaks between tests.
let ipCounter = 0;
const freshIp = () => `10.0.0.${(ipCounter += 1)}`;

beforeEach(() => {
  createCustomToken.mockClear();
  process.env.ADMIN_PHONES = `+${ADMIN}`;
  process.env.CUSTOMER_UID_SECRET = SECRET;
  process.env.MSG91_AUTH_KEY = 'authkey-not-real';
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('exchange-token', () => {
  it('mints a customer token with the derived uid and customer claim for a verified non-admin phone', async () => {
    verifyReturns(CUSTOMER);
    const res = await handler(post({ accessToken: 'tok' }, freshIp()));
    expect(res.statusCode).toBe(200);
    const uid = deriveCustomerUid(CUSTOMER, SECRET);
    expect(uid).toMatch(/^c_[A-Za-z0-9_-]{32}$/);
    expect(createCustomToken).toHaveBeenCalledWith(uid, { customer: true });
    expect(JSON.parse(res.body).role).toBe('customer');
    expect(uid).not.toContain(CUSTOMER);
  });

  it('derives the same uid for equivalent phone formats and different uids for different phones or secrets', () => {
    expect(deriveCustomerUid('9876543210', SECRET)).toBe(deriveCustomerUid(CUSTOMER, SECRET));
    expect(deriveCustomerUid('919876543211', SECRET)).not.toBe(deriveCustomerUid(CUSTOMER, SECRET));
    expect(deriveCustomerUid(CUSTOMER, `${SECRET}x`)).not.toBe(deriveCustomerUid(CUSTOMER, SECRET));
  });

  it('keeps the admin uid and claim exactly as before for an admin phone', async () => {
    verifyReturns(ADMIN);
    const res = await handler(post({ accessToken: 'tok' }, freshIp()));
    expect(res.statusCode).toBe(200);
    expect(createCustomToken).toHaveBeenCalledWith(`msg91:${ADMIN}`, { admin: true });
    expect(JSON.parse(res.body).role).toBe('admin');
  });

  it('works for admins even when the customer secret is not configured', async () => {
    delete process.env.CUSTOMER_UID_SECRET;
    verifyReturns(ADMIN);
    const res = await handler(post({ accessToken: 'tok' }, freshIp()));
    expect(res.statusCode).toBe(200);
    expect(createCustomToken).toHaveBeenCalledWith(`msg91:${ADMIN}`, { admin: true });
  });

  it('fails closed (503, no token) for customers when the secret is missing or too short', async () => {
    verifyReturns(CUSTOMER);
    delete process.env.CUSTOMER_UID_SECRET;
    expect((await handler(post({ accessToken: 'tok' }, freshIp()))).statusCode).toBe(503);
    process.env.CUSTOMER_UID_SECRET = 'short';
    expect((await handler(post({ accessToken: 'tok' }, freshIp()))).statusCode).toBe(503);
    expect(createCustomToken).not.toHaveBeenCalled();
  });

  it('returns 401 and mints nothing when MSG91 rejects the token', async () => {
    verifyReturns(null);
    const res = await handler(post({ accessToken: 'bad' }, freshIp()));
    expect(res.statusCode).toBe(401);
    expect(createCustomToken).not.toHaveBeenCalled();
  });

  it('returns 400 for a missing, non-string or oversized access token and never calls MSG91', async () => {
    verifyReturns(CUSTOMER);
    for (const body of [{}, { accessToken: '' }, { accessToken: 42 }, { accessToken: 'x'.repeat(2049) }]) {
      expect((await handler(post(body, freshIp()))).statusCode).toBe(400);
    }
    expect(global.fetch).not.toHaveBeenCalled();
    expect(createCustomToken).not.toHaveBeenCalled();
  });

  it('returns 413 for an oversized body, 400 for invalid JSON, 405 for non-POST', async () => {
    verifyReturns(CUSTOMER);
    expect((await handler(post({ accessToken: 'x'.repeat(5000) }, freshIp()))).statusCode).toBe(413);
    expect((await handler(post('{nope', freshIp()))).statusCode).toBe(400);
    expect((await handler({ httpMethod: 'GET', headers: {} })).statusCode).toBe(405);
  });

  it('ignores a phoneNumber in the request body: the uid comes from the verified phone only', async () => {
    verifyReturns(CUSTOMER);
    // The caller claims to be the admin, but the OTP only verified a customer phone.
    const res = await handler(post({ accessToken: 'tok', phoneNumber: `+${ADMIN}` }, freshIp()));
    expect(res.statusCode).toBe(200);
    expect(createCustomToken).toHaveBeenCalledWith(deriveCustomerUid(CUSTOMER, SECRET), { customer: true });
    expect(createCustomToken).not.toHaveBeenCalledWith(expect.anything(), { admin: true });
  });

  it('rejects a verified identifier that is not a phone number (e.g. an email OTP)', async () => {
    verifyReturns('someone@example.com');
    const res = await handler(post({ accessToken: 'tok' }, freshIp()));
    expect(res.statusCode).toBe(401);
    expect(createCustomToken).not.toHaveBeenCalled();
  });

  it('does not log phone numbers or tokens', async () => {
    verifyReturns(CUSTOMER);
    await handler(post({ accessToken: 'secret-access-token' }, freshIp()));
    const logged = JSON.stringify(console.error.mock.calls);
    expect(logged).not.toContain(CUSTOMER);
    expect(logged).not.toContain('secret-access-token');
  });

  it('rate limits a single client address', async () => {
    verifyReturns(CUSTOMER);
    const ip = freshIp();
    let last;
    for (let i = 0; i < 31; i += 1) last = await handler(post({ accessToken: 'tok' }, ip));
    expect(last.statusCode).toBe(429);
  });
});
